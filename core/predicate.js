
var Montage = require("./core").Montage;

var parse = require("frb/parse"),
    stringify = require("frb/stringify"),
    evaluate = require("frb/evaluate"),
    precedence = require("frb/language").precedence,
    Scope = require("frb/scope"),
    compile = require("frb/compile-evaluator");

var Predicate = exports.Predicate = Montage.specialize({
    _expression: {
        value: null
    },

    /**
     * returns Predicate's expression, which is not expected to change after being
     * initialized
     *
     * @type {string}
     */

    expression: {
        get: function() {
            return this._expression
        }
    },
    parameters: {
        value: null
    },
    /**
     * @private
     * @type {object}
     */
    _syntax: {
        value: null
    },
    /**
     * The parsed expression, a syntactic tree.
     *
     * @type {object}
     */
   syntax: {
        get: function() {
            return this._syntax || (this._syntax = parse(this._expression));
        }
    },
    _compiledSyntax: {
        value: null
    },
    /**
     * The compiled expression, a function, that is used directly for evaluation.
     *
     * @type {function}
     */
   compiledSyntax: {
        get: function() {
            return this._compiledSyntax || (this._compiledSyntax = compile(this.syntax));
        }
    },

    /**
     * Initialize a Predicate with a compiled syntax.
     *
     * @method
     * @returns {Predicate} - The Predicate initialized.
     */
    initWithSyntax: {
        value: function (syntax, parameters) {
            this._syntax = syntax;
            this.parameters = parameters;
            return this;
        }
    },

    /**
     * Initialize a Predicate with an expression as string representation
     *
     * for example expression: "(firstName= $firstName) && (lastName = $lastName)"
     *             parameters: {
     *                  "firstName": "Han",
     *                  "lastName": "Solo"
     *             }
     *
     * @method
     * @argument {string} expression - A string representaton of the predicate
     *                                  expected to be a valid Montage expression.
     * @argument {object} parameters - Optional object containing value for an expressions' prameters
     *
     * @returns {Predicate} - The Predicate initialized.
     */
    initWithExpression: {
        value: function (expression,parameters) {
            this._expression = expression;
            this.parameters = parameters;
            return this;
        }
    },

    /**
     * Backward compatibility with selector.js
     *
     * @type {function}
     */
   initWithPath: {
        value: function (path) {
            return this.initWithExpression(path);
        }
    },

    stringify: {
        value: function () {
            return this._expression || (this._expression = stringify(this.syntax));
        }
    },

    serializeSelf: {
        value: function (serializer) {
            serializer.setProperty("expression", this.stringify());
        }
    },

    deserializeSelf: {
        value: function (deserializer) {
            this._expression = deserializer.getProperty("expression") || deserializer.getProperty("path");
        }
    },
    __scope: {
        value: null
    },
    _scope: {
        get: function() {
            return this.__scope || (this.__scope = new Scope());
        }
    },
    evaluate: {
        value: function (value, parameters) {
            this._scope.parameters = parameters || this.parameters;
            this._scope.value = value;
            return this.compiledSyntax(this._scope);
        }
    }

});

// generate methods on Predicate for each of the tokens of the language.
// support invocation both as class and instance methods like
// Selector.and("a", "b") and aSelector.and("b")
precedence.forEach(function (value,type, precedence) {
    Montage.defineProperty(Predicate.prototype, type, {
        value: function () {
            var args = Array.prototype.map.call(arguments, function (argument) {
                if (typeof argument === "string") {
                    return parse(argument);
                } else if (argument.syntax) {
                    return argument.syntax;
                } else if (typeof argument === "object") {
                    return argument;
                }
            });
            // invoked as instance method
            return new (this.constructor)().initWithSyntax({
                type: type,
                args: [this.syntax].concat(args)
            });
        }
    });
    Montage.defineProperty(Predicate, type, {
        value: function () {
            var args = Array.prototype.map.call(arguments, function (argument) {
                if (typeof argument === "string") {
                    return parse(argument);
                } else if (argument.syntax) {
                    return argument.syntax;
                } else if (typeof argument === "object") {
                    return argument;
                }
            });
            // invoked as class method
            return new this().initWithSyntax({
                type: type,
                args: args
            });
        }
    });
});
