/**
 * Tests for CLI commands — command registration, arguments, and options.
 */

import { describe, it, expect } from 'vitest';
import { createProgram } from '../../src/cli/index.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf-8'));

describe('CLI — program metadata', () => {
  it('should create a program with all commands', () => {
    const program = createProgram();
    expect(program.name()).toBe('speclore');
    expect(program.version()).toBe(pkg.version);

    const commandNames = program.commands.map(c => c.name());
    expect(commandNames).toContain('setup');
    expect(commandNames).toContain('init');
    expect(commandNames).toContain('status');
    expect(commandNames).toContain('spec');
    expect(commandNames).toContain('code');
    expect(commandNames).toContain('verify');
    expect(commandNames).toContain('teardown');
  });

  it('should have correct descriptions for all commands', () => {
    const program = createProgram();
    const setup = program.commands.find(c => c.name() === 'setup');
    expect(setup?.description()).toContain('setup');

    const verify = program.commands.find(c => c.name() === 'verify');
    expect(verify?.description()).toBeTruthy();
  });

  it('should support --verbose flag on commands', () => {
    const program = createProgram();
    const setup = program.commands.find(c => c.name() === 'setup');
    const opts = setup?.options.map(o => o.long);
    expect(opts).toContain('--verbose');
  });
});

describe('CLI — spec command', () => {
  it('should have a <source> argument', () => {
    const program = createProgram();
    const spec = program.commands.find(c => c.name() === 'spec');
    const args = spec?.registeredArguments.map(a => a.name());
    expect(args).toContain('source');
  });

  it('should support -m/--module option', () => {
    const program = createProgram();
    const spec = program.commands.find(c => c.name() === 'spec');
    const opts = spec?.options.map(o => o.long);
    expect(opts).toContain('--module');
  });

  it('should support -v/--verbose option', () => {
    const program = createProgram();
    const spec = program.commands.find(c => c.name() === 'spec');
    const opts = spec?.options.map(o => o.long);
    expect(opts).toContain('--verbose');
  });
});

describe('CLI — code command', () => {
  it('should accept [features...] argument', () => {
    const program = createProgram();
    const code = program.commands.find(c => c.name() === 'code');
    const args = code?.registeredArguments.map(a => a.name());
    expect(args).toContain('features');
  });

  it('should support -v/--verbose option', () => {
    const program = createProgram();
    const code = program.commands.find(c => c.name() === 'code');
    const opts = code?.options.map(o => o.long);
    expect(opts).toContain('--verbose');
  });
});

describe('CLI — verify command', () => {
  it('should accept [features...] argument', () => {
    const program = createProgram();
    const verify = program.commands.find(c => c.name() === 'verify');
    const args = verify?.registeredArguments.map(a => a.name());
    expect(args).toContain('features');
  });

  it('should support --impact option', () => {
    const program = createProgram();
    const verify = program.commands.find(c => c.name() === 'verify');
    const opts = verify?.options.map(o => o.long);
    expect(opts).toContain('--impact');
  });

  it('should support --watch option', () => {
    const program = createProgram();
    const verify = program.commands.find(c => c.name() === 'verify');
    const opts = verify?.options.map(o => o.long);
    expect(opts).toContain('--watch');
  });

  it('should support --timeout option with default value', () => {
    const program = createProgram();
    const verify = program.commands.find(c => c.name() === 'verify');
    const timeoutOpt = verify?.options.find(o => o.long === '--timeout');
    expect(timeoutOpt).toBeDefined();
    expect(timeoutOpt?.defaultValue).toBe('30');
  });

  it('should support -v/--verbose option', () => {
    const program = createProgram();
    const verify = program.commands.find(c => c.name() === 'verify');
    const opts = verify?.options.map(o => o.long);
    expect(opts).toContain('--verbose');
  });
});

describe('CLI — init command', () => {
  it('should support -v/--verbose option', () => {
    const program = createProgram();
    const init = program.commands.find(c => c.name() === 'init');
    const opts = init?.options.map(o => o.long);
    expect(opts).toContain('--verbose');
  });

  it('should have a description', () => {
    const program = createProgram();
    const init = program.commands.find(c => c.name() === 'init');
    expect(init?.description()).toContain('Scan project structure');
  });
});

describe('CLI — setup command', () => {
  it('should support --global option', () => {
    const program = createProgram();
    const setup = program.commands.find(c => c.name() === 'setup');
    const opts = setup?.options.map(o => o.long);
    expect(opts).toContain('--global');
  });

  it('should support -v/--verbose option', () => {
    const program = createProgram();
    const setup = program.commands.find(c => c.name() === 'setup');
    const opts = setup?.options.map(o => o.long);
    expect(opts).toContain('--verbose');
  });
});

describe('CLI — teardown command', () => {
  it('should support --global option', () => {
    const program = createProgram();
    const teardown = program.commands.find(c => c.name() === 'teardown');
    const opts = teardown?.options.map(o => o.long);
    expect(opts).toContain('--global');
  });

  it('should support --yes option to skip confirmation', () => {
    const program = createProgram();
    const teardown = program.commands.find(c => c.name() === 'teardown');
    const opts = teardown?.options.map(o => o.long);
    expect(opts).toContain('--yes');
  });

  it('should support -v/--verbose option', () => {
    const program = createProgram();
    const teardown = program.commands.find(c => c.name() === 'teardown');
    const opts = teardown?.options.map(o => o.long);
    expect(opts).toContain('--verbose');
  });
});

describe('CLI — status command', () => {
  it('should support -v/--verbose option', () => {
    const program = createProgram();
    const status = program.commands.find(c => c.name() === 'status');
    const opts = status?.options.map(o => o.long);
    expect(opts).toContain('--verbose');
  });

  it('should have a description', () => {
    const program = createProgram();
    const status = program.commands.find(c => c.name() === 'status');
    expect(status?.description()).toContain('status');
  });
});
