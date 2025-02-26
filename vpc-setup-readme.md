# Financial News Engine VPC Setup

This document guides you through setting up the Virtual Private Cloud (VPC) infrastructure for the Financial News Engine project using AWS CloudFormation.

## VPC Architecture Overview

The CloudFormation template (`vpc-template.yaml`) creates a robust VPC infrastructure with the following components:

- **VPC**: A custom VPC with CIDR block 10.0.0.0/16
- **Subnets**:
  - 2 Public Subnets (10.0.0.0/24 and 10.0.1.0/24) in different Availability Zones
  - 2 Private Subnets (10.0.2.0/24 and 10.0.3.0/24) in different Availability Zones
- **Internet Gateway**: For public internet access
- **NAT Gateway**: Allows private instances to access the internet while remaining private
- **Route Tables**:
  - Public Route Table: Routes traffic through the Internet Gateway
  - Private Route Table: Routes outbound traffic through the NAT Gateway
- **Security Groups**:
  - Application Server Security Group: For EC2 instances running the Flask backend
  - Elasticsearch Security Group: For secure communication with Elasticsearch clusters
  - Elasticsearch Endpoint Security Group: For secure access to the Elasticsearch PrivateLink endpoint
- **VPC Endpoints**: 
  - S3 Gateway Endpoint: For secure access to S3 without traversing the public internet
  - Elasticsearch Interface Endpoint (PrivateLink): For secure, private connectivity to AWS Elasticsearch Service

## Prerequisites

1. Python and AWS CLI installed via pip (installed with `pip install --user awscli`)
2. AWS account with permissions to create CloudFormation stacks
3. A region selected where you want to deploy your infrastructure

## Deployment Steps

### 1. Configure AWS CLI

If you haven't already configured AWS CLI, run:

```powershell
python -m awscli configure
```

Provide your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., us-east-1)
- Default output format (json)

### 2. Validate the CloudFormation Template

```powershell
python -m awscli cloudformation validate-template --template-body file://vpc-template.yaml
```

### 3. Create the Stack

```powershell
python -m awscli cloudformation create-stack `
  --stack-name financial-news-vpc `
  --template-body file://vpc-template.yaml `
  --parameters ParameterKey=EnvironmentName,ParameterValue=production
```

You can customize the parameters:
- `VPCName`: Name of your VPC (default: FinancialNewsVPC)
- `EnvironmentName`: Environment (development, staging, production)
- `VPCCidrBlock`: CIDR block for the VPC (default: 10.0.0.0/16)
- `ElasticsearchServiceName`: The service name for Elasticsearch in your region

> **IMPORTANT:** The ElasticsearchServiceName depends on which Elasticsearch service you're using:
>
> **For Elastic Cloud (Elastic's managed service):**
> - Use region-specific service names from [Elastic documentation](https://www.elastic.co/guide/en/cloud/current/ec-traffic-filtering-vpc.html)
> - For example, in us-east-1: `com.amazonaws.vpce.us-east-1.vpce-svc-0e42e1e06ed010238`
>
> **For AWS OpenSearch Service (Amazon's managed service):**
> - Format: `com.amazonaws.<region>.opensearch` (for newer deployments)
> - Format: `com.amazonaws.<region>.es` (for older Elasticsearch deployments)

Example with all parameters specified:

```powershell
# For Elastic Cloud (Elastic's managed service)
python -m awscli cloudformation create-stack `
  --stack-name financial-news-vpc `
  --template-body file://vpc-template.yaml `
  --parameters ParameterKey=VPCName,ParameterValue=FinancialNewsVPC `
              ParameterKey=EnvironmentName,ParameterValue=production `
              ParameterKey=VPCCidrBlock,ParameterValue=10.0.0.0/16 `
              ParameterKey=ElasticsearchServiceName,ParameterValue=com.amazonaws.vpce.us-east-1.vpce-svc-0e42e1e06ed010238
```

### 4. Monitor Stack Creation

```powershell
python -m awscli cloudformation describe-stacks --stack-name financial-news-vpc
```

### 5. Get Stack Outputs

After the stack is created, retrieve the outputs (resource IDs):

```powershell
python -m awscli cloudformation describe-stacks --stack-name financial-news-vpc --query "Stacks[0].Outputs"
```

## Security Considerations

1. The template creates a security group that allows SSH (port 22) from any IP. For production, you should restrict this to specific IP addresses.
2. Consider enabling VPC Flow Logs for network monitoring and troubleshooting.
3. The Elasticsearch PrivateLink endpoint provides secure connectivity to AWS Elasticsearch Service without traffic traversing the public internet.
4. The Elasticsearch endpoint security group only allows HTTPS traffic (port 443) from the application servers.

## Next Steps

After setting up the VPC:

1. Set up your Elasticsearch/OpenSearch cluster
2. Configure your Elasticsearch service to use the PrivateLink endpoint:
   - **For Elastic Cloud**: Follow the [Elastic documentation](https://www.elastic.co/guide/en/cloud/current/ec-traffic-filtering-vpc.html) to:
     - Create a private link traffic filter rule set
     - Associate the VPC endpoint with your deployment
     - Configure DNS for proper connectivity
   - **For AWS OpenSearch**: Configure domain access policies and network settings
3. Deploy EC2 instances for your Flask backend in the private subnets
4. Configure Application Load Balancer in the public subnets
5. Set up S3 bucket for frontend hosting and CloudFront distribution

## Resource Management

### Updating the Stack

To update the stack with new parameters or template changes:

```powershell
python -m awscli cloudformation update-stack `
  --stack-name financial-news-vpc `
  --template-body file://vpc-template.yaml `
  --parameters ParameterKey=EnvironmentName,ParameterValue=production
```

To update specifically for the Elasticsearch PrivateLink endpoint:

```powershell
# For Elastic Cloud in us-east-1
python -m awscli cloudformation update-stack `
  --stack-name financial-news-vpc `
  --template-body file://vpc-template.yaml `
  --parameters ParameterKey=ElasticsearchServiceName,ParameterValue=com.amazonaws.vpce.us-east-1.vpce-svc-0e42e1e06ed010238

# For AWS OpenSearch Service in us-east-1
python -m awscli cloudformation update-stack `
  --stack-name financial-news-vpc `
  --template-body file://vpc-template.yaml `
  --parameters ParameterKey=ElasticsearchServiceName,ParameterValue=com.amazonaws.us-east-1.opensearch
```

> **Note:** The exact service name varies by region and service. Refer to the Elastic documentation or AWS documentation for the correct service name for your region.

### DNS Configuration for PrivateLink (Elastic Cloud)

> **IMPORTANT:** Elastic Cloud's PrivateLink service does not support automatic private DNS enablement. The VPC template sets `PrivateDnsEnabled: false` for this reason.

After creating the VPC endpoint for Elastic Cloud, follow these steps to configure DNS:

1. **Get the VPC Endpoint DNS Names**:
   ```powershell
   python -m awscli ec2 describe-vpc-endpoints --vpc-endpoint-ids <your-endpoint-id> --query "VpcEndpoints[0].DnsEntries"
   ```
   This will return several DNS names for your endpoint.

2. **Create a Private Hosted Zone in Route 53**:
   ```powershell
   python -m awscli route53 create-hosted-zone `
     --name "vpce.<region>.aws.elastic-cloud.com" `
     --vpc VPCId=<your-vpc-id>,VPCRegion=<region> `
     --caller-reference $(Get-Date -Format "yyyyMMddHHmmss")
   ```
   Replace `<region>` with your AWS region (e.g., us-east-1).

3. **Create CNAME Records**:
   For each Elasticsearch deployment you want to access via PrivateLink, create a CNAME record:
   ```powershell
   python -m awscli route53 change-resource-record-sets `
     --hosted-zone-id <your-hosted-zone-id> `
     --change-batch '{
       "Changes": [
         {
           "Action": "CREATE",
           "ResourceRecordSet": {
             "Name": "<deployment-id>.es.vpce.<region>.aws.elastic-cloud.com",
             "Type": "CNAME",
             "TTL": 300,
             "ResourceRecords": [
               { "Value": "<vpc-endpoint-dns-name>" }
             ]
           }
         }
       ]
     }'
   ```
   - Replace `<deployment-id>` with your Elastic Cloud deployment ID
   - Replace `<vpc-endpoint-dns-name>` with one of the DNS names from step 1
   - Replace `<region>` with your AWS region

4. **Test the Connection**:
   After DNS propagation (which can take a few minutes), test the connection:
   ```powershell
   curl -v https://<deployment-id>.es.vpce.<region>.aws.elastic-cloud.com
   ```

5. **Update Elastic Cloud Traffic Filters**:
   Follow the [Elastic documentation](https://www.elastic.co/guide/en/cloud/current/ec-traffic-filtering-vpc.html) to:
   - Create a private link traffic filter rule set using your VPC endpoint ID
   - Associate the rule set with your Elasticsearch deployments

The specific DNS configuration steps may vary depending on your network setup. Refer to the [Elastic documentation on AWS PrivateLink](https://www.elastic.co/guide/en/cloud/current/ec-traffic-filtering-vpc.html) for detailed instructions.

### Deleting the Stack

```powershell
python -m awscli cloudformation delete-stack --stack-name financial-news-vpc
```

## Troubleshooting

- If the stack creation fails, check the error in the CloudFormation console or using:
  ```powershell
  python -m awscli cloudformation describe-stack-events --stack-name financial-news-vpc
  ```
- Ensure your IAM user/role has sufficient permissions to create all resources
- If subnet creation fails, ensure the specified Availability Zones exist in your region
- If you see command not found errors with `aws`, remember to use `python -m awscli` as shown above 