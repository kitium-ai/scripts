"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exec = exec;
exports.pathExists = pathExists;
exports.readJson = readJson;
exports.writeJson = writeJson;
exports.findFiles = findFiles;
exports.getProjectRoot = getProjectRoot;
exports.getRelativePath = getRelativePath;
exports.log = log;
exports.getEnv = getEnv;
exports.measure = measure;
var child_process_1 = require("child_process");
var fs_1 = require("fs");
var path_1 = require("path");
/**
 * Execute a shell command and capture output
 * @param command Command to execute
 * @param args Arguments to pass to the command
 * @param options Execution options
 * @returns Result with exit code and output
 */
function exec(command_1) {
    return __awaiter(this, arguments, void 0, function (command, args, options) {
        var _a, verbose, _b, throwOnError, spawnOptions;
        if (args === void 0) { args = []; }
        if (options === void 0) { options = {}; }
        return __generator(this, function (_c) {
            _a = options.verbose, verbose = _a === void 0 ? true : _a, _b = options.throwOnError, throwOnError = _b === void 0 ? true : _b, spawnOptions = __rest(options, ["verbose", "throwOnError"]);
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var _a, _b;
                    var child = (0, child_process_1.spawn)(command, args, __assign({ stdio: 'pipe', shell: true }, spawnOptions));
                    var stdout = '';
                    var stderr = '';
                    (_a = child.stdout) === null || _a === void 0 ? void 0 : _a.on('data', function (data) {
                        stdout += data.toString();
                        if (verbose) {
                            process.stdout.write(data);
                        }
                    });
                    (_b = child.stderr) === null || _b === void 0 ? void 0 : _b.on('data', function (data) {
                        stderr += data.toString();
                        if (verbose) {
                            process.stderr.write(data);
                        }
                    });
                    child.on('close', function (code) {
                        if (throwOnError && code !== 0) {
                            reject(new Error("Command failed with exit code ".concat(code, ": ").concat(stderr || stdout)));
                        }
                        else {
                            resolve({ code: code, stdout: stdout, stderr: stderr });
                        }
                    });
                    child.on('error', function (error) {
                        reject(error);
                    });
                })];
        });
    });
}
/**
 * Check if a file or directory exists
 * @param filePath Path to check
 * @returns True if path exists
 */
function pathExists(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, fs_1.promises.access(filePath)];
                case 1:
                    _b.sent();
                    return [2 /*return*/, true];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * Read a JSON file
 * @param filePath Path to JSON file
 * @returns Parsed JSON object
 */
function readJson(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var content;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs_1.promises.readFile(filePath, 'utf-8')];
                case 1:
                    content = _a.sent();
                    return [2 /*return*/, JSON.parse(content)];
            }
        });
    });
}
/**
 * Write a JSON file
 * @param filePath Path to write to
 * @param data Object to serialize
 * @param pretty Whether to pretty-print JSON
 */
function writeJson(filePath_1, data_1) {
    return __awaiter(this, arguments, void 0, function (filePath, data, pretty) {
        var content;
        if (pretty === void 0) { pretty = true; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
                    return [4 /*yield*/, fs_1.promises.writeFile(filePath, content, 'utf-8')];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
/**
 * Find files matching a pattern
 * @param dir Directory to search
 * @param pattern File pattern to match
 * @returns Array of matching file paths
 */
function findFiles(dir, pattern) {
    return __awaiter(this, void 0, void 0, function () {
        function walk(currentDir) {
            return __awaiter(this, void 0, void 0, function () {
                var entries, _i, entries_1, entry, fullPath;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, fs_1.promises.readdir(currentDir, { withFileTypes: true })];
                        case 1:
                            entries = _a.sent();
                            _i = 0, entries_1 = entries;
                            _a.label = 2;
                        case 2:
                            if (!(_i < entries_1.length)) return [3 /*break*/, 6];
                            entry = entries_1[_i];
                            // Skip common non-source directories
                            if (['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
                                return [3 /*break*/, 5];
                            }
                            fullPath = path_1.default.join(currentDir, entry.name);
                            if (!entry.isDirectory()) return [3 /*break*/, 4];
                            return [4 /*yield*/, walk(fullPath)];
                        case 3:
                            _a.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            if (pattern.test(entry.name)) {
                                files.push(fullPath);
                            }
                            _a.label = 5;
                        case 5:
                            _i++;
                            return [3 /*break*/, 2];
                        case 6: return [2 /*return*/];
                    }
                });
            });
        }
        var files;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    files = [];
                    return [4 /*yield*/, walk(dir)];
                case 1:
                    _a.sent();
                    return [2 /*return*/, files];
            }
        });
    });
}
/**
 * Get the root directory of the current project
 * @returns Root directory path
 */
function getProjectRoot() {
    return process.cwd();
}
/**
 * Get a relative path from project root
 * @param filePath Absolute path
 * @returns Relative path from project root
 */
function getRelativePath(filePath) {
    return path_1.default.relative(getProjectRoot(), filePath);
}
/**
 * Log a message with prefix
 * @param level Log level (info, warn, error, success)
 * @param message Message to log
 */
function log(level, message) {
    var prefix = {
        info: '[INFO]',
        warn: '[WARN]',
        error: '[ERROR]',
        success: '[✓]',
    }[level];
    console.log("".concat(prefix, " ").concat(message));
}
/**
 * Get environment variable or throw
 * @param name Environment variable name
 * @param defaultValue Default value if not set
 * @returns Environment variable value
 */
function getEnv(name, defaultValue) {
    var value = process.env[name];
    if (!value && defaultValue === undefined) {
        throw new Error("Environment variable ".concat(name, " is not set"));
    }
    return value || defaultValue || '';
}
/**
 * Measure execution time of an async function
 * @param label Label for the measurement
 * @param fn Async function to measure
 * @returns Function result
 */
function measure(label, fn) {
    return __awaiter(this, void 0, void 0, function () {
        var start, result, duration;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    start = Date.now();
                    return [4 /*yield*/, fn()];
                case 1:
                    result = _a.sent();
                    duration = Date.now() - start;
                    log('info', "".concat(label, " completed in ").concat(duration, "ms"));
                    return [2 /*return*/, result];
            }
        });
    });
}
