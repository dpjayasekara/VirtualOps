module.exports = function(zSession){
    var authService = require('../auth/authService')();
    var db = require('../db');
    var Allocation = require('../db/schemas/dbAllocation');
    var response = require('../../config/responseMessages');

    var requestForAllocation = function(jsonAllocRequest, callback){

        authService.authorizeResourceRequest(jsonAllocRequest, function(err, authorizedRequest){
            if(err){
                callback(response.error(500, 'Internal Server Error!', err));
            }
            else{
                var hostFilter = new (require('./hostFilter'))(authorizedRequest.requestContent);
                hostFilter.fetchCloudInfo(zSession, function(err, filteredHostsInfo){

                    if(filteredHostsInfo.length == 0){
                        var priorityScheduler = new (require('./priorityScheduler'))();
                        /// do whatever you do with priority scheduler
                        priorityScheduler.scheduleRequest(authorizedRequest, function(err, selectedHost){
                            // results returned from migration scheduler or preemptive scheduler
                            if(!err){
                                allocateRequest(selectedHost, authorizedRequest, function (err, result) {
                                    if(err){
                                        callback(err);
                                    }
                                    else{
                                        callback(null, result);
                                    }
                                });
                            }
                            else{
                                callback(err);
                            }
                        });
                    }
                    else{
                        console.log("Selected Host: "+ JSON.stringify(filteredHostsInfo[0]));
                        //findBestHost(filteredHostsInfo, authorizedRequest, function (err, bestHost) {
                        //    if(err){
                        //        callback(err);
                        //    }
                        //    else{
                        //        console.log(bestHost);
                        //    }
                        //});
                    }
                });
            }
        });

    };

    var requestForDeAllocation = function (jsonDeAllocRequest, callback) {
        //de-allocate resources using cloudstack api and execute callback.
    };

    var allocateRequest = function (selectedHost, authorizedRequest, callback) {
        var cloudstack = new (require('csclient'))({
            serverURL: 'http://10.8.106.208:8080/client/api?',
            apiKey: 'gQQEJNh_5v6pgohQG_xYPTHRgRyXUvqoaZMmxZXkdDFZxpp4_XaWzvwtFGIPz58Hf5Lkfbu8jZ09xIkcnNSVYw',
            secretKey: 'szcpwWvdRp48ExEloj2V3E3rjaQfCO-Cqt69f1q-VTWtqVyKAZHd4Ajn9Fo6IDN2kPb0gpkOmzElikooKj41Pw'
        });

        var thisAllocationId = (require('mongoose')).Types.ObjectId().toString();

        cloudstack.execute('createInstanceGroup', { name: thisAllocationId }, function(err, result){
            if(err){
                callback(response.error(500, 'Cloudstack error!', err));
            }
            else{
                //TODO: create a service offering for VM here
                    //TODO: create a disk offering for VM here
                        //TODO: register a template for VM here
                            //TODO: Deploy VM here

                //following part should come inside the callback of VM deployment cloudstack function
                var allocation = new Allocation({
                    _id: thisAllocationId,
                    from: Date.now(),
                    expires: null,
                    userSession: authorizedRequest.session,
                    allocationTimestamp: Date.now(),
                    allocationPriority: authorizedRequest.requestContent.group[0].priority[0],
                    associatedHosts: [selectedHost],
                    vmGroupID: result.createinstancegroupresponse.instancegroup.id,
                    allocationRequestContent: authorizedRequest.requestContent
                });

                allocation.save(function (err) {
                    if(err){
                        response.error(500, 'Database Error!', err);
                    }
                });
            }
        });

    };

    var findBestHost = function(filteredHostsInfo, authorizedRequest, callback){

        var getValueByKey = function(hostInfo, key){
            for(var i in hostInfo.items){
                if(hostInfo.items[i].itemKey == key){
                    return hostInfo.items[i].value;
                }
            }
            return false;
        };

        var getHostByZabbixId = function(filteredHosts, hostID){
            for(var i in filteredHosts){
                if(filteredHosts[i].hostId == hostID){
                    return filteredHosts[i];
                }
            }
            return false;
        };

        var getDBHostByZabbixId = function (zabbixId, callback) {
            //TODO: take zabbix ID as a parameter and get the host from the database and return through callback
        };

        if(filteredHostsInfo.length == 1){
            //TODO: call getDBHostByZabbixId() here
            callback(null, filteredHostsInfo[0]);
        }
        else{
            var bestHostZabbixID = null;
            var minMemoryHostInfo = filteredHostsInfo[0];
            var minCoresHostInfo = filteredHostsInfo[0];
            var minCPUFreqHostInfo = filteredHostsInfo[0];
            var minCPUUtilHostInfo = filteredHostsInfo[0].hostId;

            for(var i in filteredHostsInfo){
                if(getValueByKey(filteredHostsInfo[i], 'vm.memory.size[available]') < getValueByKey(getHostByZabbixId(filteredHostsInfo, minMemoryHostInfo), 'vm.memory.size[available]')){
                    minMemoryHostInfo = filteredHostsInfo[i];
                }
                if(getValueByKey(filteredHostsInfo[i], 'system.cpu.num') < getValueByKey(getHostByZabbixId(filteredHostsInfo, minCoresHostInfo), 'system.cpu.num')){
                    minCoresHostInfo = filteredHostsInfo[i];
                }
                //TODO: need to do this for frequency as well
            }

            //TODO: compare these two hosts and select the most suitable considering whether the request is memory-intensive or cpu-intensive

            var requestingMemory = parseInt(authorizedRequest.requestContent.group[0].min_memory[0].size[0]);

            switch ((authorizedRequest.requestContent.group[0].min_memory[0].unit[0]).toLowerCase()){
                case 'b':
                    break;
                case 'kb':
                    requestingMemory = requestingMemory * 1024;
                    break;
                case 'mb':
                    requestingMemory = requestingMemory * 1024 * 1024;
                    break;
                case 'gb':
                    requestingMemory = requestingMemory * 1024 * 1024 * 1024;
                    break;
                case 'tb':
                    requestingMemory = requestingMemory * 1024 * 1024 * 1024 * 2014;
                    break;
                default :
                    callback(response.error(403, "Unsupported unit for min_memory in resource request!"));
            }

            var requestingCores = parseInt(authorizedRequest.requestContent.group[0].cpu[0].cores[0]);
            var requestingCPUFreq = parseFloat(authorizedRequest.requestContent.group[0].cpu[0].frequency[0]);

            switch ((authorizedRequest.requestContent.group[0].cpu[0].unit[0]).toLowerCase()){
                case 'hz':
                    break;
                case 'khz':
                    requestingCPUFreq = requestingCPUFreq * 1000;
                    break;
                case 'mhz':
                    requestingCPUFreq = requestingCPUFreq * 1000 * 1000;
                    break;
                case 'ghz':
                    requestingCPUFreq = requestingCPUFreq * 1000 * 1000 * 1000;
                    break;
                default :
                    callback(response.error(403, "Unsupported unit for cpu frequency in resource request!"));
            }

            console.log("mincoresZabbixId = "+minCoresHostInfo.hostId);
            console.log("minmemoryZabbixId = "+minMemoryHostInfo.hostId);

            //TODO: call getDBHostByZabbixId() here
            callback(null, true);
        }
    }
    
    var findBestStorage = function (filteredHostsInfo) {
        //TODO: find best storage
    };

    return {
        requestForAllocation: requestForAllocation,
        requestForDeAllocation: requestForDeAllocation
    }


}
