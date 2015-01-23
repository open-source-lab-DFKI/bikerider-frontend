
/**
 * Generator for executable language-grammars (i.e. converted JSON grammars).
 * 
 * This generator uses Jison for compiling the JSON grammar.
 * 
 * @see https://github.com/zaach/jison
 * 
 * 
 * @depends Jison
 * @depends jQuery.Deferred
 * @depends jQuery.extend
 */
define(['jison', 'constants', 'grammarConverter', 'jquery'], function(jison, constants, GrammarConverter, $){

//////////////////////////////////////  template loading / setup for JS/CC generator ////////////////////////////////

var deferred = $.Deferred();
//no async initialization necessary for PEG.js generator -> resolve immediately
deferred.resolve();

/**
 * The argument name when generating the grammar function:
 * the argument holds the raw text that will be parsed by the generated grammar.
 * 
 * NOTE: this argument/variable name must not collide with any code that is generated for the grammar.
 * 
 * @constant
 * @private
 */
var INPUT_FIELD_NAME = 'asr_recognized_text';

var jisonGen = {
	init: function(callback){
		if(callback){
			deferred.always(callback);
		}
		return deferred;
	},
	isAsyncCompilation: function(){ return false; },
	compileGrammar: function(theConverterInstance, instanceId, fileFormatVersion, callback){
        
		//attach functions for PEG.js conversion/generation to the converter-instance: 
		$.extend(theConverterInstance, JisonGrammarConverterExt);
		
		//start conversion: create grammar in JS/CC syntax (from the JSON definition):
		theConverterInstance.init();
		if(jison.printError){
			Jison.print = jison.printError;
		}
        theConverterInstance.convertJSONGrammar();
        var grammarDefinition = theConverterInstance.getJSCCGrammar();
        
        //TODO make configurable?
        var options = {type: 'lalr'};//'lr0' | 'slr' | 'lr' | 'll' | default: lalr
        
        var hasError = false;
        var grammarParser;
        try{
        	var cfg = bnf.parse(grammarDefinition);
        	var parser = Jison.Generator(cfg, options);
        	grammarParser = parser.generate();
        } catch(error) {
//        	"{
//        	  "message": "Expected \"=\" or string but \"_\" found.",
//        	  "expected": [
//        	    {
//        	      "type": "literal",
//        	      "value": "=",
//        	      "description": "\"=\""
//        	    },
//        	    {
//        	      "type": "other",
//        	      "description": "string"
//        	    }
//        	  ],
//        	  "found": "_",
//        	  "offset": 4104,
//        	  "line": 40,
//        	  "column": 6,
//        	  "name": "SyntaxError"
//        	}"
        	hasError = true;
        	var msg = ' while compiling grammar "' + instanceId+ '": ';
        	if(error.name === 'SyntaxError'){
        		msg= 'SyntaxError' + msg + error.message;
        	}
        	else {
        		msg = 'Error' + msg + (error && error.stack? error.stack : error);
        	}
        	
        	if(typeof error.lineNumber !== 'undefined'){
        		msg += ' at line '+error.lineNumber;
        	}

        	if(typeof error.column !== 'undefined'){
        		msg += ':'+error.column;
        	}
        	
        	if(typeof error.index !== 'undefined'){
        		msg += ' (offset '+error.index+')';
        	}
        	
        	if(jison.printError){
        		jison.printError(msg);
        	}
        	else {
        		console.error(msg);
        	}
        	msg = '[INVALID GRAMMAR] ' + msg;
        	grammarParser = '{ parse: function(){ var msg = '+JSON.stringify(msg)+'; console.error(msg); throw msg;} }';//FIXME
        }
        
        //FIXME attach compiled parser to some other class/object
        var moduleNameString = '"'+instanceId+'GrammarJs"';
        var addGrammarParserExec = 
//    	  'define('+moduleNameString+',["semanticInterpreter"],function(semanticInterpreter){\n'
    	  '(function(){\n  var semanticInterpreter = require("semanticInterpreter");\n'//FIXME
        	+ 'var fileFormatVersion = '+fileFormatVersion+';\n  '
        	+ 'var module = {};\n'
        	+ grammarParser
//        	+ ';\nvar grammarFunc = function(){ return parser.parse.apply(parser, arguments);};\n'
        	+ ';\nvar grammarFunc = function(){\n'
        	+ '  var result;  try {\n'
        	+ '    result = parser.parse.apply(parser, arguments);\n'
        	+ '  } catch (err){\n'
        	+ '    console.error(err.stack?err.stack:err); result = {};\n'//TODO warning/error messaging? -> need to handle encoded chars, if error message should be meaningful
        	+ '  }\n'
        	+ '  return result;\n'
        	+ '};\n'
        	+ 'semanticInterpreter.addGrammar("'
        		+instanceId
        		+'", grammarFunc, fileFormatVersion);\n\n'
        	+ 'semanticInterpreter.setStopwords("'
        		+instanceId+'",'

        		//store stopwords with their Unicode representation (only for non-ASCII chars)
        		+JSON.stringify(
        				theConverterInstance.getEncodedStopwords()
        		).replace(/\\\\u/gm,'\\u')//<- revert JSON.stringify encoding for the Unicodes
        	+ ');\n'
        	+ 'return grammarFunc;\n'
//                	+ '});\n'
//                	+ 'require(['+moduleNameString+']);\n';//requirejs needs this, in order to trigger initialization of the grammar-module (since this is a self-loading module that may not be referenced in a dependency in a define() call...)
        	+ '})();'//FIXME

        	//for Chrome / FireFox debugging: provide an URL for eval'ed code
        	+ '//@ sourceURL=gen/grammar/'+instanceId+'_compiled_grammar\n//# sourceURL=gen/grammar/'+instanceId+'_compiled_grammar\n'
        ;
        
        theConverterInstance.setJSGrammar(addGrammarParserExec);

//        doAddGrammar(instanceId, theConverterInstance);
        
        try{
        	
        	eval(addGrammarParserExec);
        	
        } catch (err) {

        	//TODO russa: generate meaningful error message with details about error location
        	//			  eg. use esprima (http://esprima.org) ...?
        	//			... as optional dependency (see deferred initialization above?)
        	
        	var evalMsg = 'Error during eval() for "'+ instanceId +'": ' + err;
        	
        	if(jison.printError){
        		jison.printError(evalMsg);
        	}
        	else {
        		console.error(evalMsg);
        	}
        	
        	if(! hasError){
            	evalMsg = '[INVALID GRAMMAR JavaScript CODE] ' + evalMsg;
            	var parseDummyFunc = (function(msg, error){ 
            		return function(){ console.error(msg); console.error(error); throw msg;};
            	})(evalMsg, err);
            	
            	parseDummyFunc.hasErrors = true;
            	
            	//theConverterInstance = doGetGrammar(instanceId);
            	theConverterInstance.setGrammarFunction(parseDummyFunc);
        	}
        	
        }
        
        //invoke callback if present:
        if(callback){
        	callback(theConverterInstance);
        }
        
        return theConverterInstance;
	}
};


////////////////////////////////////// Jison specific extensions to GrammarConverter ////////////////////////////////

var JisonGrammarConverterExt = {
		
	init: function(){
		
		this.THE_INTERNAL_GRAMMAR_CONVERTER_INSTANCE_NAME = "theGrammarConverterInstance";
		this._PARTIAL_MATCH_PREFIX = "$";

		this.grammar_tokens = "/* --- Token definitions --- */\n\n/* Characters to be ignored */\n"
			+ "\\s+    /* skip whitespace */\n\n/* Non-associative tokens */\n";
		
		this.grammar_utterances = "";
		this.grammar_phrases = "phrases:\n    ";
		this.token_variables = "%{\n  var " + this.variable_prefix + "result = '';\n";
		this.tokens_array = [];
		
		this.grammar_special_tokens = "";
		this.grammar_special_tokens_no = 0;
		
	},
	convertJSONGrammar: function(){
	
		this.json_grammar_definition = this.maskJSON(this.json_grammar_definition);
		
		this.token_variables += "  var semanticAnnotationResult = {};\n"
			+ "  var _flatten = function(match){ if(!match.join){ return match;} for(var i=0, size = match.length; i < size; ++i){if(match[i].join){match[i] = _flatten(match[i])}} return match.join('') };\n"
			+ "  var _tok = function(field, match){ match = _flatten(match); field[match] = match; return match;}\n"
		;
		
		this.parseTokens();
		this.parseUtterances();
		this.parseStopWords();
		
		this.jscc_grammar_definition = this.token_variables
				+ "%}\n\n"
				+ "/* lexical grammar */\n%lex\n\n"
				+ this.grammar_special_tokens
				+ "\n\n%%"
				+ this.grammar_tokens
				+ "\n<<EOF>>   %{ return 'EOF'; %};\n\n/lex"
				+ "\n\n/* --- Grammar specification --- */\n%start utterance\n\n%% /* language grammar */\n\nutterance:\n    phrases EOF %{ "
				
				//TODO use LOG LEVEL for activating / deactivating this:
				+ "console.log("
				+ this.variable_prefix + "result); "
				
				+ "semanticAnnotationResult.result = "
				+ this.variable_prefix + "result; return "+ this.variable_prefix +"result; %};\n\n" + this.grammar_utterances
				+ "\n" + this.grammar_phrases + ";\n\n"
		;

		this.json_grammar_definition = this.unmaskJSON(this.json_grammar_definition);
	},
	parseTokens: function(){
		var self = this;
		var json_tokens =  this.json_grammar_definition.tokens;
		var pref = self.variable_prefix;
		
		
		for(token_name in json_tokens){
			
			var words = json_tokens[token_name];
			
			self.token_variables += "  var " + pref
					+ token_name.toLowerCase() + " = {};\n";
			
			
			//FIXME TODO handle RegExpr: need to be encoded without String-quoting!, i.e. instead of
			//							 FLASE:   '[a-zA-Z_]+'
			//							 CORRECT: [a-zA-Z_]+
			
			//OLD IMPL.:
//			var grammar_token = token_name + "\n    = match:('";
//			for(var i=0, size = words.length; i < size ; ++i){
//				if(i > 0){
//					grammar_token += "'/'";
//				}
//				grammar_token += words[i];
//			}
//			
//			grammar_token += "')    " + token_name + " { " + self.variable_prefix
//					+ token_name.toLowerCase() + "[match] = match; return match;};\n";
//			
//			self.grammar_tokens += grammar_token;
			
			//NEW IMPL.:
			var sb = [];
			
			var isNotRegExpr = true;
			for(var i=0, size = words.length; i < size ; ++i){
				
				//NOTE RegExpr need to be recoded -> need to check, if current word is RegExp!
				//  example (see also _convertRegExpr()):
				//	INPUT:   '[a-zA-Z_]+'
				//	RECODED: [a-zA-Z_]+
				isNotRegExpr = this._checkIfNotRegExpr(words[i]);
				if( isNotRegExpr ){
					sb.push("\"");
				}
				
				//add TOKEN string:
				if(isNotRegExpr){
					sb.push(words[i]);
				}
				else {
					var special_token_name = "regexpr" + (++ this.grammar_special_tokens_no);
					this.grammar_special_tokens += special_token_name + "    " + this._convertRegExpr(words[i]) + "\n";
					sb.push("{" + special_token_name + "}");
				}

				
				if( isNotRegExpr ){
					sb.push("\"");
				}
				
				//if there is another word following, add OR operator
				if(i < size-1){
					sb.push("|");
				}
			}
			
			//close assignment for "= match:(" and create JavaScript processing for token
			sb.push(
				"     %{ _tok(" + pref + token_name.toLowerCase() + ", yytext); return '"+token_name+"'; %}\n"
			);
			
			self.grammar_tokens += sb.join("");
		}
	},
	parseUtterances: function(){
		var self = this;
		var utt_index = 0;
		var json_utterances =  this.json_grammar_definition.utterances;

		for(utterance_name in json_utterances){
			var utterance_def = json_utterances[utterance_name];
			if(utt_index > 0){
				self.grammar_phrases += "\n\t|";
			}
			utt_index++;
			self.doParseUtterance(utterance_name, utterance_def);
		}
	},
	doParseUtterance: function(utterance_name, utterance_def){
		
		var self = this; 
		
		self.token_variables += "  var " + self.variable_prefix
				+ utterance_name.toLowerCase() + " = {};\n";
		

		var grammar_utterance = utterance_name + ":\n   ";
		//self.grammar_phrases += utterance_name + "  " +  self.doCreateSemanticInterpretationForUtterance(utterance_name, utterance_def);
		self.grammar_phrases += utterance_name + "  " ;
		var phrases = utterance_def.phrases;
		var semantic  = self.doCreateSemanticInterpretationForUtterance(utterance_name, utterance_def);
		
		for(var index=0,size=phrases.length; index < size; ++index){
			if(index > 0){
				grammar_utterance += "\n  | ";
			}
			var phrase = phrases[index];
			var semantic_interpretation = self.doCreateSemanticInterpretationForPhrase(
					utterance_name.toLowerCase(), utterance_def, phrase, semantic
			);
			grammar_utterance += /*phrase +*/ semantic_interpretation;
		}
		self.grammar_utterances += grammar_utterance + ";\n\n";
	},
	doCreateSemanticInterpretationForUtterance: function(utterance_name, utterance_def){
		var semantic = utterance_def.semantic,
		variable_index, variable_name;
		
		if(IS_DEBUG_ENABLED) console.debug('doCreateSemanticInterpretationForUtterance: '+semantic);//debug
		
		var semantic_as_string = JSON.stringify(semantic);
		if( semantic_as_string != null){
		this.variable_regexp.lastIndex = 0;
		var variables = this.variable_regexp.exec(semantic_as_string);
		while (variables != null) {
			var variable = variables[1],
			remapped_variable_name = "";
			
			if(IS_DEBUG_ENABLED) console.debug("variables " + variable, semantic_as_string);//debug
			
			variable_index = /\[(\d+)\]/.exec(variable);
			variable_name = new RegExp('_\\$([a-zA-Z_][a-zA-Z0-9_\\-]*)').exec(variable)[1];
//			variableObj = /_\$([a-zA-Z_][a-zA-Z0-9_\-]*)(\[(\d+)\])?(\["semantic"\]|\['semantic'\]|\.semantic)?/.exec(variable);
//			variableObj = /_\$([a-zA-Z_][a-zA-Z0-9_\-]*)(\[(\d+)\])?((\[(("(.*?[^\\])")|('(.*?[^\\])'))\])|(\.(\w+)))?/.exec(variable);
	//"_$NAME[INDEX]['FIELD']":  _$NAME                  [ INDEX ]        [" FIELD "]  | [' FIELD ']      |   .FIELD
			if (variable_index == null) {
				remapped_variable_name = variable;
			} else {
					remapped_variable_name = variable.replace(
							  '[' + variable_index[1] + ']'
							, "["
								+ utterance_name.toLowerCase() + "_temp['phrases']['"
								+ variable_name.toLowerCase() + "']["
								+ variable_index[1]
							+ "]]");
					//TODO replace try/catch with safe_acc function
					//     PROBLEM: currently, the format for variable-access is not well defined
					//              -> in case of accessing the "semantic" field for a variable reference of another Utterance
					//                 we would need another safe_acc call 
					//				   ... i.e. need to parse expression for this, but since the format is not well defined
					//				   we cannot say, for what exactly we should parse...
					//                 NORMAL VAR EXPR: 		_$a_normal_token[0]
					//                 ACCESS TO SEMANTICS: 	_$other_utterance[0]['semantic']
					//                                      but this could also be expressed e.g. as _$other_utterance[0].semantic
					//                                      ...
//					remapped_variable_name = variable.replace(
//							  '[' + variable_index[1] + ']'
//							, "[safe_acc("
//								+ utterance_name.toLowerCase() + "_temp, 'phrases', '"
//								+ variable_name.toLowerCase() + "', "
//								+ variable_index[1] 
//								+ ")]"
//							);
			}
			semantic_as_string = semantic_as_string.replace(
					variables[0],
					" function(){try{return " + remapped_variable_name
						+ ";} catch(e){return void(0);}}() "
//					"' + " + remapped_variable_name + " + '"//TODO replace try/catch with safe_acc function
			);
			variables =  this.variable_regexp.exec(semantic_as_string);
		}
		}
		return semantic_as_string;
	},
	doCreateSemanticInterpretationForPhrase: function(utterance_name, utterance_def, phrase, semantic_as_string){
		var phraseList = phrase.split(/\s+/),
		length = phraseList.length,
		duplicate_helper = {};
	
		var phraseStr = "";
	//	var result = " { var _m = ";
		var i = 0;
		
		var pharseMatchResult = " $$ = ";
	//	for (; i < length; ++i){
	//		pharseMatchResult += this._PARTIAL_MATCH_PREFIX + (i+1);
	//		if(i < length){
	//			pharseMatchResult += " + ' ' + ";
	//		}
	//	}
		
	//	result += "; var "+utterance_name+"_temp = {}; "+utterance_name+"_temp['phrases'] = {};";
		
		var semanticProcResult = "var "+utterance_name+"_temp = {}; "+utterance_name+"_temp['phrases'] = {};";
		var num;
		for (i = 0; i < length; ++i) {
			
			num = i+1;
			
			//create STR for phrase-matching
			phraseStr += " " + phraseList[i];
			
			//create STR for concatenated match of all partial phrases
			pharseMatchResult += this._PARTIAL_MATCH_PREFIX + num;
			if(num < length){
				pharseMatchResult += " + ' ' + ";
			}
			
			//create STR for semantic processing of phrase
			if (typeof(duplicate_helper[phraseList[i]]) == "undefined") {
				duplicate_helper[phraseList[i]] = 0;
				semanticProcResult += utterance_name+"_temp['phrases']['"+phraseList[i].toLowerCase()+"'] = [];\n\t\t";
			} else {
				duplicate_helper[phraseList[i]] += 1;
			}
			semanticProcResult += utterance_name + "_temp['phrases']['"
						+ phraseList[i].toLowerCase() + "']["
						+ duplicate_helper[phraseList[i]] + "] = " + this._PARTIAL_MATCH_PREFIX + num
						+ ";\n\t\t";
		}
		
		semanticProcResult += "var " + this.variable_prefix + "phrase = $$; " + utterance_name
				+ "_temp['phrase']=" + this.variable_prefix + "phrase; "
				+ utterance_name + "_temp['semantic'] = " + semantic_as_string
				+ "; " + this.variable_prefix + utterance_name + "["
				+ this.variable_prefix + "phrase] = " + utterance_name + "_temp; "
				+ this.variable_prefix + "result = " + utterance_name + "_temp;";
		
		return phraseStr + " %{\n\t   " + pharseMatchResult +  "; " + semanticProcResult + "; \n\t%} ";
	},
	_checkIfNotRegExpr: function(token){
		//test for character-group
		if( ! /([^\\]\[)|(^\[).*?[^\\]\]/.test(token))
			//test for group
			return ! /([^\\]\()|(^\().*?[^\\]\)/.test(token);
		return false;
	},
	_convertRegExpr: function(token){
		var sb = [], ch, last = null, isString = false, isGroup = false, isEsc = false/*, hasOr = false*/;
		for(var i=0, size = token.length; i < size; ++i){
			ch = token.charAt(i);
			switch(ch){
			case '(':
			case ')':
			case '[':
			case ']':
			case '+':
			case '*':
			case '?':
			case '$':
			case '^':
			case '.':
			case '|':
				if(last !== '\\'){

					//if changed from STRING -> non-STRING, then "close" string first:
					if(isString){
						sb.push("\" ");
						isString = false;
					}
					
					//insert reg-expr symbol
//					if(ch !== '|'){
						sb.push(ch);
//					}
//					else {
//						sb.push(' | ');
//						hasOr = true;
//					}
					
					//is character-group opening/closing?
					if(isGroup && ch === ']'){
						isGroup = false;
					}
					else if(!isGroup && ch === '['){
						isGroup = true;
					}
					
					
					break;
				}
				else {
					isEsc = true;
				}
			default:
				
				if(isEsc){
					sb.splice(sb.length-1);//remove last element, i.e. the escape-character
					isEsc = false;
				}
				
				//if changed from non-STRING -> STRING, then "open" string now:
				if(!isGroup && !isString){
					sb.push(" \"");
					isString = ! isGroup;
				}
				sb.push(ch);
			}
			
			last = ch;
		}
		
		//if last char was a STRING, "close" string now:
		if(isString){
			sb.push("\"");
		}
//		if(hasOr){
//			sb.unshift('(');
//			sb.push(')');
//		}
		return sb.join('');
	}
};


return jisonGen;

});