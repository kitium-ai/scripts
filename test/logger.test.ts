import { logger } from '../src/utils/logger';
import chalk from 'chalk';

// Mock console methods
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should log info messages', () => {
    logger.info('test info');
    expect(consoleLogSpy).toHaveBeenCalledWith(chalk.blue('ℹ'), 'test info');
  });

  it('should log success messages', () => {
    logger.success('test success');
    expect(consoleLogSpy).toHaveBeenCalledWith(chalk.green('✔'), 'test success');
  });

  it('should log warning messages', () => {
    logger.warn('test warn');
    expect(consoleLogSpy).toHaveBeenCalledWith(chalk.yellow('⚠'), 'test warn');
  });

  it('should log error messages', () => {
    logger.error('test error');
    expect(consoleErrorSpy).toHaveBeenCalledWith(chalk.red('✖'), 'test error');
  });

  it('should log step messages', () => {
    logger.step('test step');
    expect(consoleLogSpy).toHaveBeenCalledWith(chalk.cyan('›'), 'test step');
  });
});
