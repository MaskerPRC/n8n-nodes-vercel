# n8n-nodes-vercel

This is an n8n community node for deploying static HTML sites to Vercel.

[Vercel](https://vercel.com/) is a cloud platform for static sites and serverless functions that enables developers to deploy web applications with zero configuration.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)  
[Operations](#operations)  
[Credentials](#credentials)  
[Compatibility](#compatibility)  
[Usage](#usage)  
[Resources](#resources)  
[Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

In your n8n instance, go to **Settings** → **Community Nodes** → **Install** and enter:

```
n8n-nodes-vercel
```

Or install via npm:

```bash
npm install n8n-nodes-vercel
```

## Operations

### Deployment

- **Create**: Deploy a static HTML site to Vercel
  - Supports blocking mode (wait for completion) or async mode (return immediately)
  - Automatically creates or reuses projects
  - Optional project protection disabling
- **Get**: Query deployment status by deployment ID

## Credentials

This node requires a Vercel API token:

1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Create a new token
3. Enter the token in the node credentials
4. (Optional) Enter your Team ID if deploying to a team account

## Compatibility

- **Minimum n8n version**: 1.0.0
- **Tested with**: n8n 1.0.0+

## Usage

### Basic Deployment

1. Add the Vercel node to your workflow
2. Configure credentials with your Vercel API token
3. Select **Deployment** → **Create**
4. Enter your HTML content (or file path)
5. Optionally specify a project name (if not provided, a new project will be created)
6. Choose deployment mode:
   - **Blocking**: Wait for deployment to complete (default)
   - **Async**: Return immediately with deployment ID
7. Configure other options:
   - **Deploy to Production**: Whether to deploy to production environment
   - **Disable Project Protection**: Disable SSO and password protection (default: enabled)
   - **Max Wait Time**: Maximum time to wait for deployment completion (blocking mode only)

### Query Deployment Status

1. Select **Deployment** → **Get**
2. Enter the deployment ID
3. The node will return the current deployment status

### Deployment Modes

- **Blocking Mode** (default): The node waits for the deployment to complete (success or failure) before returning. This is useful when you need to know the final status immediately.
- **Async Mode**: The node returns immediately with a deployment ID. You can use the **Get** operation to query the status later.

### Project Management

- If you provide a **Project Name**, the node will:
  - Look for an existing project with that name
  - If found, deploy to that project
  - If not found, create a new project with that name
- If you don't provide a **Project Name**, the node will:
  - Create a new project with the name `n8n-{timestamp}`

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [Vercel API Documentation](https://vercel.com/docs/rest-api)
* [Vercel Platform Documentation](https://vercel.com/docs)

## Version history

### 0.6.1
- Changed default deployment mode to blocking

### 0.6.0
- Integrated disable project protection into deployment configuration
- Made project name optional
- Fixed project ID handling

### 0.5.1
- Fixed missing `name` field in deployment request

### 0.5.0
- Added deployment status query operation
- Added blocking and async deployment modes
- Improved error handling

### 0.4.1
- Fixed file content encoding (plain text instead of base64)

### 0.4.0
- Removed vercel.json requirement
- Fixed deployment file format

### 0.3.1
- Initial release with basic deployment functionality
