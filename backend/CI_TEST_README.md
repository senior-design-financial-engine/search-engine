# CI/CD Testing with Mock Data Generator

This guide explains how the test setup works with the mock data generator in your CI/CD pipeline.

## Overview

The mock data generator is configured to work in both AWS CI/CD environments and local development without requiring Elasticsearch credentials. The tests are designed to run in your CI pipeline by:

1. Using mocked Elasticsearch APIs for unit tests
2. Using mock data generators for functional testing
3. Setting `USE_MOCK_DATA=true` in the test environment

## Test Behavior

### elasticsearch_test.py

This file serves two purposes:

1. **Unit Testing**: Contains tests that verify the functionality of the Engine class with a mocked Elasticsearch client.
2. **Development Server**: Can be run as a mock API server with `python elasticsearch_test.py --server`.

The test class has been refactored to work properly with both unittest and pytest (which is used in CI/CD).

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

1. Tests use a mocked Elasticsearch client
2. The `USE_MOCK_DATA=true` setting bypasses the need for real credentials
3. The Engine is initialized with a mock implementation when `USE_MOCK_DATA` is true

## Troubleshooting

If you encounter issues with tests in the CI pipeline:

1. Check that the elasticsearch_test.py file has the proper unittest structure
2. Verify that `.env.test` contains `USE_MOCK_DATA=true`
3. Ensure that all necessary files are included in the deployment package
4. Look for test failures that might indicate structural changes in real Engine code that mock tests need to adapt to 