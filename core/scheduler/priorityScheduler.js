module.exports = function(){

    var scheduleRequest = function(authorizedRequest, allPossibleHosts, callback){

        var Allocations = require('../db/schemas/dbAllocation');
        var responseMessage = require('../../config/responseMessages');
        var underscore = require('underscore');

        var migrationScheduler = new (require('./migrationScheduler'))();

        migrationScheduler.findHostByMigration(0, authorizedRequest, allPossibleHosts, function(error, selectedHost){

            if(error){
                callback(error);
            }
            else{
                if(selectedHost){
                    callback(null, selectedHost);
                }
                else{
                    Allocations.find({
                        allocationPriority: {
                            $lt: authorizedRequest.requestContent.priority
                        }
                    }).sort({'allocationPriority':1}).exec(function (err, allocations) {
                        if(err){
                            callback(responseMessage.error(500, 'Database Error', err));
                        }
                        else{
                            if(allocations){
                                if(allocations.length){
                                    //there are allocation with less priority than the coming, they can be preempted if useful

                                    var preemptiveScheduler = new (require('./preemptiveScheduler'))();

                                    preemptiveScheduler.findHostByPreemption(authorizedRequest, allocations, allPossibleHosts, function (err, selectedHost) {
                                        if(!err){
                                            callback(null, selectedHost);
                                        }
                                        else{
                                            //If no host was found either using migration scheduler or preemptive scheduler, just return result message to the vm scheduler.
                                            callback(err);
                                        }
                                    });
                                }
                                else{
                                    callback(responseMessage.error('200','No enough resource to serve your request at this moment !'));
                                }
                            }
                            else{
                                callback(responseMessage.error(200, 'Database returned none'));
                            }
                        }
                    });
                }

            }

        });

    };

    return {
        scheduleRequest: scheduleRequest
    }

};