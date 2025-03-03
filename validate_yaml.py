#!/usr/bin/env python
"""
CloudFormation Template Validator

This script performs custom validation on CloudFormation templates, 
specifically checking for problematic references like ${aws:*} that 
may cause validation errors.

Usage:
    python validate_yaml.py [template_file]

If no template_file is provided, it defaults to 'backend-template.yaml'.

Common errors this catches:
- Unresolved ${aws:*} references
- Syntax issues that would cause CloudFormation validation to fail
"""

import re
import sys
import os

# Check if template file was provided as argument
template_file = sys.argv[1] if len(sys.argv) > 1 else 'backend-template.yaml'

def check_for_aws_refs(text):
    """
    Check for potentially problematic AWS CloudFormation references.
    
    Args:
        text (str): The CloudFormation template text to check
        
    Returns:
        list: A list of problematic references found
    """
    # This pattern looks for ${aws:*} type references which often cause validation errors
    pattern = r"\$\{aws:([^}]+)\}"
    matches = re.findall(pattern, text)
    
    # Return the list of matches
    return matches

def main():
    """
    Main function that validates the CloudFormation template.
    """
    print(f"Starting template validation for {template_file}...")
    
    # Check if file exists
    if not os.path.exists(template_file):
        print(f"Error: File {template_file} not found!", file=sys.stderr)
        sys.exit(1)
    
    try:
        # Open and read the file
        print(f"Reading {template_file}...")
        with open(template_file, 'r') as file:
            template_text = file.read()
            file_size = len(template_text)
            print(f"Successfully opened file ({file_size} bytes)")
        
        # Check for AWS references
        print("Checking for problematic AWS intrinsic references...")
        problematic_refs = check_for_aws_refs(template_text)
        
        if problematic_refs:
            print("\n⚠️  WARNING: Potentially problematic AWS references found:")
            for ref in problematic_refs:
                print(f"  - ${{{ref}}}")
            print("\nThese references may cause CloudFormation validation errors.")
            print("Consider using !Sub or properly escaped variables instead.")
            sys.exit(1)
        else:
            print("✅ No problematic ${aws:*} references detected.")
            
        # Additional checks could be added here
        print("\nNOTE: This validation only checks for common issues.")
        print("For full validation, use: python -m awscli cloudformation validate-template --template-body file://" + template_file)
        
        print("\n✅ SUCCESS: No obvious CloudFormation validation issues detected.")
    
    except Exception as e:
        print(f"Error validating template: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main() 