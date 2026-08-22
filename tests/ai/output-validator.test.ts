/**
 * Output validator unit tests.
 */

import { describe, it, expect } from 'vitest';
import { validateFeatureOutput } from '../../src/ai/output-validator.js';

describe('validateFeatureOutput', () => {
  it('should pass valid Gherkin content', () => {
    const content = `Feature: User Login
  Scenario: Successful login
    Given the system is running
    When the user enters valid credentials
    Then the user is logged in
`;
    const result = validateFeatureOutput(content);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.scenarioCount).toBe(1);
  });

  it('should fail on empty content', () => {
    const result = validateFeatureOutput('');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Empty response from AI provider');
  });

  it('should fail on whitespace-only content', () => {
    const result = validateFeatureOutput('   \n\n  ');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Empty response from AI provider');
  });

  it('should detect missing Feature: keyword', () => {
    const content = `Scenario: Something
  Given something
  When something
  Then something
`;
    const result = validateFeatureOutput(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Feature:'))).toBe(true);
  });

  it('should detect missing Scenario: keyword', () => {
    const content = `Feature: Something
  Some text without scenarios
`;
    const result = validateFeatureOutput(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Scenario:'))).toBe(true);
  });

  it('should detect Gherkin syntax errors', () => {
    const content = 'This is not valid Gherkin at all';
    const result = validateFeatureOutput(content);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Gherkin syntax error') || e.includes('Missing'))).toBe(true);
  });

  it('should count multiple scenarios', () => {
    const content = `Feature: Order Management
  Scenario: Create order
    Given the system is running
    When a valid order is submitted
    Then the order is created

  Scenario: Reject invalid order
    Given the system is running
    When an invalid order is submitted
    Then the order is rejected
`;
    const result = validateFeatureOutput(content);
    expect(result.valid).toBe(true);
    expect(result.scenarioCount).toBe(2);
  });
});
