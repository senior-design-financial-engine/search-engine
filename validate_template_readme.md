# CloudFormation Template Validator

A specialized validation script that helps identify common issues in AWS CloudFormation templates that may cause deployment failures.

## Why Use This Validator?

The AWS CLI's `validate-template` command only checks for basic CloudFormation syntax errors but misses many common issues that can cause stack creation failures, such as:

- Unresolved `${aws:InstanceId}` references
- Improper VPC resource references
- Common syntax patterns that pass validation but fail deployment

This script performs additional checks to catch these issues before you attempt to deploy your stack.

## Prerequisites

- Python 3.6 or higher
- Basic understanding of CloudFormation templates

## Installation

No installation is required, simply download the `validate_yaml.py` script to your project directory.

```bash
curl -O https://raw.githubusercontent.com/[your-org]/financial-news-engine/main/validate_yaml.py
```

## Usage

### Basic Validation

```bash
python validate_yaml.py
```

This will validate the default template file `backend-template.yaml` in the current directory.

### Validate a Specific Template

```bash
python validate_yaml.py your-template-file.yaml
```

### Interpreting Results

The script will output:

- ✅ SUCCESS: If no known issues are detected
- ⚠️ WARNING: If potential problems are found, with details about each issue
- Error messages if the validation fails completely

## Common Issues Detected

### AWS Intrinsic References

CloudFormation often fails when templates contain references like `${aws:InstanceId}` that cannot be resolved. The script detects these patterns and warns you about them.

**Example problematic code:**
```yaml
UserData:
  Fn::Base64: !Sub |
    #!/bin/bash
    # Set instance ID
    INSTANCE_ID=${aws:InstanceId}
```

**Recommended fix:**
```yaml
UserData:
  Fn::Base64: !Sub |
    #!/bin/bash
    # Set instance ID
    INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
```

### Other Potential Issues

The script is designed to be extended with additional validation checks. Future versions may detect:

- Circular dependencies
- Invalid resource reference patterns
- Commonly misconfigured properties

## Integration with CI/CD

Add this validation step to your CI/CD pipeline before the CloudFormation deployment:

```yaml
validate:
  stage: validate
  script:
    - python validate_yaml.py backend-template.yaml
  only:
    changes:
      - "*.yaml"
      - "*.yml"
```

## Limitations

This validator does not replace the AWS CloudFormation validation service. It is designed to catch common issues that the AWS validator misses. For complete validation, always use both:

```bash
# Run custom validation first
python validate_yaml.py

# Then run AWS validation
python -m awscli cloudformation validate-template --template-body file://backend-template.yaml
```

## Support and Contributions

If you find an issue with the validator or want to suggest additional validation checks, please open an issue or pull request in the repository.

## Related Documentation

- [AWS CloudFormation User Guide](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html)
- [AWS CloudFormation Template Reference](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-reference.html)
- [Lambda VPC Integration Documentation](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html) 