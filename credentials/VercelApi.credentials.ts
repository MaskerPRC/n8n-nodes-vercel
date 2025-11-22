import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class VercelApi implements ICredentialType {
	name = 'vercelApi';

	displayName = 'Vercel API';

	icon: Icon = { light: 'file:../icons/vercel.svg', dark: 'file:../icons/vercel.dark.svg' };

	documentationUrl = 'https://vercel.com/docs/rest-api';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description: 'Vercel API Token. Get it from https://vercel.com/account/tokens',
		},
		{
			displayName: 'Team ID',
			name: 'teamId',
			type: 'string',
			default: '',
			description: 'Vercel Team ID (optional). Only required if you want to deploy to a team.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials?.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.vercel.com',
			url: '/v2/user',
			method: 'GET',
		},
	};
}

