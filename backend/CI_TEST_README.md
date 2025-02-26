# CI/CD Testing with Mock Data Generator

This guide explains how the test setup works with the mock data generator in your CI/CD pipeline.

## Overview

The mock data generator is configured to work in both AWS CI/CD environments and local development without requiring Elasticsearch credentials. The tests are designed to run in your CI pipeline by:

1. Using the MockEngine class directly instead of mocking Elasticsearch
2. Using mock data generators for functional testing
3. Setting `USE_MOCK_DATA=true` in the test environment

## Test Approach

Our testing approach has been simplified to avoid dependency issues when mocking Elasticsearch:

1. Instead of mocking the Elasticsearch client, we use the `MockEngine` class directly
2. Tests assert against the mock implementation rather than a mocked real implementation
3. This removes complexities related to patching and module dependencies

### elasticsearch_test.py

This file serves two purposes:

1. **Unit Testing**: Contains tests that verify the functionality of the MockEngine class
2. **Development Server**: Can be run as a mock API server with `python elasticsearch_test.py --server`

The test class now imports and uses the MockEngine directly, making it more robust against changes in how the real Engine imports dependencies.

### Mock Data Generator

The mock data generator (`es_database/mock_data_generator.py`) provides:

- A `MockEngine` class that mimics the real Engine without Elasticsearch
- Functions to generate realistic test data
- Test helpers to mimic the Elasticsearch response format

## CI/CD Integration

In your AWS CodeBuild pipeline:

1. The tests run without requiring Elasticsearch credentials
2. The `USE_MOCK_DATA=true` setting in `.env.test` ensures tests use mocked data
3. Unit tests run using pytest with coverage reporting

## API Key Requirements

**Important**: You do NOT need to provide an actual Elasticsearch API key for testing, even in the CI/CD pipeline. This is because:

1. Tests use the MockEngine instead of the real Engine
2. The `USE_MOCK_DATA=true` setting bypasses the need for real credentials
3. No actual Elasticsearch connection is made during testing

## Troubleshooting

If you encounter issues with tests in the CI pipeline:

1. Ensure the mock_data_generator.py file is correctly deployed
2. Verify that `.env.test` contains `USE_MOCK_DATA=true`
3. Check that the MockEngine implements all methods being tested
4. Ensure the test file is importing the correct modules

## Debugging Tests

When running tests that fail in CI but pass locally:

1. Try running with pytest directly: `pytest -v elasticsearch_test.py`
2. Check for environment differences between local and CI
3. Verify module import paths are correct and consistent 