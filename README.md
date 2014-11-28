VirtualOps
==========

Resource Aware and Policy Based Virtual Machine Scheduling in Medium-scale clouds

Cloud computing enables providing Computing resources over an internet connection to the users. In an IaaS (Infrastructure as a Service) Cloud, these computing resources include Processing power, Memory, Storage and Network resources. In a medium-scale cloud such as a University/Enterprise cloud, there may be potentially different types of users including students, lecturers, internal/external researchers etc. who get benefits from the Cloud in different ways. They may have varying requirement in terms of resources, priorities and allocation periods for the resources. These different requirements may include processing intensive and memory intensive applications such as HPC applications and data mining application, labs which needs to be deployed for a particular period of time. Priority schemes and Dynamic VM (Virtual Machine) migration schemes should also be used in order to satisfy all these requirements in an organized manner. But, currently known IaaS platforms has no native capability to perform such dynamic resource allocations and preemption mechanisms. 

This project is to develop a resource scheduling framework which can be used as an extension to an existing IaaS Cloud Platform to support dynamic VM scheduling including preemption and VM migration. This resource scheduler performs resource allocation according to the predefined priority level to the particular user who issued the resource request. Resource scheduling algorithm is also capable of perform scheduling aware of performance capabilities of the cloud hosts and current resource usage which is monitored continuously using a resource monitor. Time based scheduling (e.g.:- Deploying labs for a particular period of time) is also performed while considering priority schemes and existing resource allocations.
