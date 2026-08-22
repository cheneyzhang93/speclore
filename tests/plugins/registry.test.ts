/**
 * Tests for plugin system — registry and built-in plugins.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PluginRegistry, resetRegistry, getRegistry } from '../../src/plugins/registry.js';

describe('PluginRegistry', () => {
  beforeEach(() => {
    resetRegistry();
  });

  it('should register all built-in plugins', () => {
    const registry = new PluginRegistry();
    registry.registerBuiltins();

    expect(registry.getReaders().length).toBe(5);
    expect(registry.getWriters().length).toBe(3);
    expect(registry.getParsers().length).toBe(3);
  });

  it('should find reader by file extension', () => {
    const registry = new PluginRegistry();
    registry.registerBuiltins();

    const mdReader = registry.findReader('test.md');
    expect(mdReader).toBeDefined();
    expect(mdReader?.name).toBe('markdown-reader');
  });

  it('should find writer by tool name', () => {
    const registry = new PluginRegistry();
    registry.registerBuiltins();

    const cursorWriter = registry.findWriter('cursor');
    expect(cursorWriter).toBeDefined();
    expect(cursorWriter?.toolName).toBe('cursor');
  });

  it('should find parser by test output', () => {
    const registry = new PluginRegistry();
    registry.registerBuiltins();

    const junitOutput = '<?xml version="1.0"?><testsuite><testcase name="test"/></testsuite>';
    const parser = registry.findParser(junitOutput);
    expect(parser).toBeDefined();
    expect(parser?.framework).toBe('junit');
  });

  it('should return singleton registry', () => {
    const r1 = getRegistry();
    const r2 = getRegistry();
    expect(r1).toBe(r2);
  });
});

describe('Built-in parsers', () => {
  it('JUnit parser should parse XML test results', async () => {
    const { JUnitParser } = await import('../../src/plugins/builtin/junit-parser.js');
    const parser = new JUnitParser();

    const xml = `<?xml version="1.0"?>
<testsuite name="Auth" tests="2" failures="1">
  <testcase name="login" classname="Auth" time="0.042"/>
  <testcase name="logout" classname="Auth" time="0.015">
    <failure>Expected true but got false</failure>
  </testcase>
</testsuite>`;

    expect(parser.canParse(xml)).toBe(true);
    const results = parser.parse(xml, []);
    expect(results.length).toBe(2);
    expect(results[0].status).toBe('passed');
    expect(results[1].status).toBe('failed');
    expect(results[1].error).toContain('Expected true');
  });

  it('Jest parser should parse JSON test results', async () => {
    const { JestParser } = await import('../../src/plugins/builtin/jest-parser.js');
    const parser = new JestParser();

    const json = JSON.stringify({
      testResults: [{
        name: 'test.ts',
        assertionResults: [
          { title: 'pass', fullName: 'pass', status: 'passed', duration: 10, failureMessages: [] },
          { title: 'fail', fullName: 'fail', status: 'failed', duration: 20, failureMessages: ['Error'] },
        ],
      }],
    });

    expect(parser.canParse(json)).toBe(true);
    const results = parser.parse(json, []);
    expect(results.length).toBe(2);
    expect(results[0].status).toBe('passed');
    expect(results[1].status).toBe('failed');
  });
});

describe('PluginRegistry — edge cases', () => {
  it('should return undefined for unknown reader extension', () => {
    const registry = new PluginRegistry();
    registry.registerBuiltins();
    const reader = registry.findReader('file.xyz123');
    expect(reader).toBeUndefined();
  });

  it('should return undefined for unknown writer tool', () => {
    const registry = new PluginRegistry();
    registry.registerBuiltins();
    const writer = registry.findWriter('nonexistent-tool');
    expect(writer).toBeUndefined();
  });

  it('should return undefined for unparseable test output', () => {
    const registry = new PluginRegistry();
    registry.registerBuiltins();
    const parser = registry.findParser('random text that is not test output');
    expect(parser).toBeUndefined();
  });

  it('should detect writer by tool name (qoder)', () => {
    const registry = new PluginRegistry();
    registry.registerBuiltins();
    const qoderWriter = registry.findWriter('qoder');
    expect(qoderWriter).toBeDefined();
    expect(qoderWriter?.toolName).toBe('qoder');
  });

  it('should detect writer by tool name (claude)', () => {
    const registry = new PluginRegistry();
    registry.registerBuiltins();
    const claudeWriter = registry.findWriter('claude');
    expect(claudeWriter).toBeDefined();
    expect(claudeWriter?.toolName).toBe('claude');
  });
});
