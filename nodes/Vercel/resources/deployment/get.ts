import type { INodeProperties } from 'n8n-workflow';

const showOnlyForDeploymentGet = {
	operation: ['get'],
	resource: ['deployment'],
};

export const deploymentGetDescription: INodeProperties[] = [
	{
		displayName: 'Deployment ID',
		name: 'deploymentId',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: showOnlyForDeploymentGet,
		},
		description: 'The ID of the deployment to query',
	},
];

