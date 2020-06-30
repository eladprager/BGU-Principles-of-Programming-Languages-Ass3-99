import {AtomicGraph, CompoundGraph, Edge, Graph, GraphContent, isAtomicGraph, isCompoundGraph, isNodeDecl,
    isNodeRef, makeCompoundGraph, makeDir, makeEdge, makeGraph, makeHeader, makeNodeDecl, makeNodeRef,
    Node} from "./mermaid-ast"
import {AtomicExp, Exp, isAtomicExp, isBinding, isCompoundExp, isDefineExp, isExp, isProgram, isVarDecl, Parsed,
    parseL4Exp, parseL4Program, Program, VarDecl} from "./L4-ast"
import {bind, isOk, makeFailure, makeOk, mapResult, Result, safe2} from "../shared/result";
import {first, isEmpty, rest} from "../shared/list"
import {chain, map, reduce, union} from "ramda";
import {isToken, parse as p} from "../shared/parser";
import {isArray, isBoolean, isNumber, isString} from "../shared/type-predicates"
import {CompoundSExp, EmptySExp, isCompoundSExp, isEmptySExp, isSymbolSExp, SExpValue, SymbolSExp} from "./L4-value"
import {Sexp} from "s-expression";

const defaultGraphDirection = "TD";

// Signature: unparseMermaid(g)
// Type: [Graph -> Result<string>]
// Purpose: Converting Mermaid AST to a concrete string syntax

export const unparseMermaid = (exp: Graph): Result<string> =>
    bind(unparseContent(exp.content), 
        (contentString: string): Result<string> =>
            makeOk(`graph ${exp.header.dir.val}${contentString}`));

//Called from unparseMermaid//
export const unparseContent = (exp: GraphContent): Result<string> =>
    isCompoundGraph(exp) ? unparseCompound(exp) :
    isAtomicGraph(exp) ? unparseAtomic(exp) :
    makeFailure("unparseContent: Failed");

//Called from unparseContent//
export const unparseAtomic = (node: Node): Result<string> =>
    isNodeDecl(node) && node.label === "AppExp" ? makeOk(`${node.id}[${node.label}]`) :
    isNodeDecl(node) && node.label === ":" ? makeOk(`${node.id}[${node.label}]`) :
    isNodeDecl(node) && node.label === "ProcExp" ? makeOk(`${node.id}[${node.label}]`) :
    isNodeDecl(node) && node.label === "LitExp" ? makeOk(`${node.id}[${node.label}]`) :
    isNodeDecl(node) && node.label === "DefineExp" ? makeOk(`${node.id}[${node.label}]`) :
    isNodeDecl(node) && node.label === "Program" ? makeOk(`${node.id}[${node.label}]`) :
    isNodeDecl(node) && node.label === "IfExp" ? makeOk(`${node.id}[${node.label}]`) :
    isNodeDecl(node) && node.label === "LetExp" ? makeOk(`${node.id}[${node.label}]`) :
    isNodeDecl(node) && node.label === "LetRecExp" ? makeOk(`${node.id}[${node.label}]`) :
    isNodeDecl(node) && node.label === "SetExp" ? makeOk(`${node.id}[${node.label}]`) :
    isNodeRef(node) ? makeOk(`${node.id}`) :
    isNodeDecl(node) ? makeOk(`${node.id}[${node.label}]`) :
    makeFailure("unparseAtomic: Failed");

//Called from unparseContent//
export const unparseCompound = (exp: CompoundGraph): Result<string> =>
    bind((mapResult(unparseEdge, exp.edge)), 
        (edgeString: string[]): Result<string> => 
            makeOk(reduce(concatLines,"" , [edgeString[0]].concat(edgeString.slice(1, edgeString.length)))));

//Called from unparseCompound//
export const concatLines = (str1: string, str2: string): string =>
    str1 +'\n'+ str2;

//Called from unparseCompound//
export const unparseEdge = (edge: Edge): Result<string> =>
    safe2((from: string, to: string): Result<string> => 
        
        edge.label !== undefined ? 
            makeOk(`${from} -->|${edge.label}| ${to}`) :
        makeOk(`${from} --> ${to}`))
        
        (unparseNode(edge.from), (unparseNode(edge.to)));

//Called from unparseEdge//
export const unparseNode = (node: Node): Result<string> =>
    isNodeDecl(node) && node.label === "AppExp" ? makeOk(`${node.id}[${node.label}]`) :
    isNodeDecl(node) && node.label === ":" ? makeOk(`${node.id}[${node.label}]`) :
    isNodeDecl(node) && node.label === "ProcExp" ? makeOk(`${node.id}[${node.label}]`) :
    isNodeDecl(node) && node.label === "LitExp" ? makeOk(`${node.id}[${node.label}]`) :
    isNodeDecl(node) && node.label === "DefineExp" ? makeOk(`${node.id}[${node.label}]`) :
    isNodeDecl(node) && node.label === "Program" ? makeOk(`${node.id}[${node.label}]`) :
    isNodeDecl(node) && node.label === "IfExp" ? makeOk(`${node.id}[${node.label}]`) :
    isNodeDecl(node) && node.label === "LetExp" ? makeOk(`${node.id}[${node.label}]`) :
    isNodeDecl(node) && node.label === "LetRecExp" ? makeOk(`${node.id}[${node.label}]`) :
    isNodeDecl(node) && node.label === "SetExp" ? makeOk(`${node.id}[${node.label}]`) :
    isNodeRef(node) ? makeOk(`${node.id}`) :
    isNodeDecl(node) ? makeOk(`${node.id}["${node.label}"]`) :
    makeFailure("unparseNode: Failed");

// Signature: L4toMermaid(concrete)
// Type: [string -> Result<string>]
// Purpose: Map concrete syntax of an L4 expression into a Mermaid diagram expression

export const L4toMermaid = (concrete: string): Result<string> =>
    bind(p(concrete),
    (sexp: Sexp): Result<string> =>
        sexp === "" || isEmpty(sexp) ? makeFailure("Unexpected empty program") :
        isToken(sexp) ? makeFailure("Program cannot be a single token") :
        isArray(sexp) ?
            first(sexp) === "L4" ? L4ProgramToMermaid(sexp) :
            L4ExpToMermaid(sexp) :
        makeFailure("Unexpected type " + sexp));

//Called from L4toMermaid//
export const L4ProgramToMermaid = (sexp: Sexp) : Result<string> =>
    bind(parseL4Program(sexp), 
        (p: Program): Result<string> => 
            bind(mapL4toMermaid(p), unparseMermaid));

//Called from L4toMermaid//
export const L4ExpToMermaid = (sexp: Sexp): Result<string> =>
    bind(parseL4Exp(sexp), 
        (p: Exp): Result<string> => 
            bind(mapL4toMermaid(p), unparseMermaid));
    
// Signature: mapL4toMermaid(exp)
// Type: [Parsed -> Result<Graph>]
// Purpose: Convert L4 AST to a Mermaid AST
// Called from L4ProgramToMermaid and L4ExpToMermaid //
export const mapL4toMermaid = (exp: Parsed): Result<Graph> => 
    isProgram(exp) ? mapProgramtoMermaid(exp) : 
    isExp(exp) ? mapExpToMermaid(exp) :
    makeFailure("mapL4toMermaid: Failed");

//Called from mapL4toMermaid//
export const mapProgramtoMermaid = (program: Program): Result<Graph> => {
    const newIds = renameVars([program.tag, "exps"], []); 
    return bind(mapCompoundExpToContent(program.exps, newIds[1], newIds), 
        (expsGraph: CompoundGraph): Result<Graph> =>
            bind(makeOk(makeEdge(makeNodeDecl(newIds[0], program.tag), 
                                makeNodeDecl(newIds[1], ":"), 
                                "exps")), 
                (firstEdge: Edge): Result<Graph> => 
                    bind(joinEdges([makeCompoundGraph([firstEdge]), expsGraph]), 
                        (unitedGraph: CompoundGraph): Result<Graph> =>
                            makeOk(makeGraph(makeHeader(makeDir(defaultGraphDirection)), unitedGraph)))))
};

//Called from mapL4toMermaid//
export const mapExpToMermaid = (exp: Exp): Result<Graph> => {
    const newName = renameVars([exp.tag], []);
    return bind(mapExptoContent(exp, newName[0], newName), 
            (g: GraphContent): Result<Graph> =>
                isCompoundGraph(g) ? bind(changeRootToNodeDecl(g, exp.tag), 
                                        (c: CompoundGraph): Result<Graph> => 
                                        makeOk(makeGraph(makeHeader(makeDir(defaultGraphDirection)), c))) :
                isAtomicGraph(g) ?
                    makeOk(makeGraph(makeHeader(makeDir(defaultGraphDirection)), g)) :
                makeFailure("mapExpToMermaid: Failed"))
};

//Called from mapExpToMermaid//
export const mapExptoContent = 
    (exp: Exp | CompoundSExp | VarDecl | SymbolSExp | EmptySExp | 
        number  | boolean | string | Exp[],
    expId: string,
    forbbidenIds: string[]): Result<GraphContent> =>

    isDefineExp(exp) ? mapCompoundExpToContent(exp, expId, forbbidenIds) :
    isCompoundExp(exp) ? mapCompoundExpToContent(exp, expId, forbbidenIds) :
    isCompoundSExp(exp) ? mapCompoundExpToContent(exp, expId, forbbidenIds) :
    isAtomicExp(exp) ? mapAtomictoContent(exp, expId) :
    isVarDecl(exp) ? mapAtomictoContent(exp, expId) :
    isSymbolSExp(exp) ?  mapAtomictoContent(exp, expId) :
    isEmptySExp(exp) ? mapEmptyExpToContent(exp, expId) :
    isNumber(exp) ? mapAtomicValuesToContent(exp, expId) :
    isString(exp) ? mapAtomicValuesToContent(exp, expId) :
    isBoolean(exp) ? mapAtomicValuesToContent(exp, expId) :
    isArray(exp) ? mapCompoundExpToContent(exp, expId, forbbidenIds) :
    isBinding(exp) ? mapCompoundExpToContent(exp, expId, forbbidenIds) :
    makeFailure(`mapExptoContent: Unknown Expression: ${JSON.stringify(exp)}`);

//Called from mapExptoContent//
export const mapAtomictoContent = (exp: AtomicExp | VarDecl | SymbolSExp, 
                                expId: string): Result<AtomicGraph> => 
    Object.values(exp).length === 2 ? 
        Object.values(exp)[1] === true ? makeOk(makeNodeDecl(expId,`${exp.tag}(#t)`)) :
        Object.values(exp)[1] === false ? makeOk(makeNodeDecl(expId,`${exp.tag}(#f)`)) :
        makeOk(makeNodeDecl(expId,`${exp.tag}(${Object.values(exp)[1]})`)) :
    makeFailure("mapAtomictoContent: Atomic Expression with more than 2 keys");

//Called from mapExptoContent//
export const mapAtomicValuesToContent = (exp: number | string | boolean, expId: string): Result<AtomicGraph> =>
    exp === true ? makeOk(makeNodeDecl(expId,`${typeof(exp)}(#t)`)) :
    exp === false ? makeOk(makeNodeDecl(expId,`${typeof(exp)}(#f)`)) :
    makeOk(makeNodeDecl(expId,`${typeof(exp)}(${exp})`));

//Called from mapExptoContent//
export const mapEmptyExpToContent = (exp: EmptySExp, expId: string): Result<AtomicGraph> =>
    makeOk(makeNodeDecl(expId,`${exp.tag}`));

//Called from mapExptoContent and mapProgramtoMermaid//
export const mapCompoundExpToContent = (exp: Exp | CompoundSExp | Exp[], 
    expId: string, forbbidenIds: string[]): Result<CompoundGraph> => {

    const keys = !isArray(exp) ? rest(Object.keys(exp)) : [];

    const values = !isArray(exp) ? rest(Object.values(exp)) : exp;

    const valuesTags = map((v):string => "" === extractTag(v)
                                            ? keys[values.indexOf(v)] 
                                            : extractTag(v), values);

    const childrenIds = renameVars(valuesTags, forbbidenIds); 

    return bind(convertValues(values, expId, childrenIds, union(childrenIds, forbbidenIds)), 

        (childGraphs: GraphContent[]): Result<CompoundGraph> => 
            bind(mapResult((gc: GraphContent): Result<Edge>=>
                    isArray(values[childGraphs.indexOf(gc)]) ? 
                        makeOk(makeEdge(
                                makeNodeRef(expId),
                                makeNodeDecl(childrenIds[childGraphs.indexOf(gc)], ":"),
                                !isArray(exp) ? keys[childGraphs.indexOf(gc)] : undefined)) :
                    isAtomicGraph(gc) ? 
                        makeOk(makeEdge(
                                makeNodeRef(expId),
                                gc,
                                keys[childGraphs.indexOf(gc)])) : 
                    isCompoundGraph(gc) ? 
                        makeOk(makeEdge(
                                makeNodeRef(expId),
                                makeNodeDecl(childrenIds[childGraphs.indexOf(gc)], 
                                                valuesTags[childGraphs.indexOf(gc)]),
                                                keys[childGraphs.indexOf(gc)])) :
                    makeFailure("mapCompoundExptoContent: Failed")
                , childGraphs),
                (childrenEdges: Edge[]): Result<CompoundGraph> => 
                    bind(joinEdges(childGraphs), 
                        (unitedChildren: CompoundGraph): Result<CompoundGraph> =>
                            joinEdges([makeCompoundGraph(childrenEdges), unitedChildren]))))

};

//Called from mapCompoundExpToContent//
export const convertValues = (exps: Exp[], expId: string, childrenIds: string[], forbbidenIds: string[]): Result<GraphContent[]> =>
    reduce((convertedExps: Result<GraphContent[]>, e: Exp): Result<GraphContent[]> =>
        !isOk(convertedExps) ? convertedExps :
        bind(makeOk(union(childrenIds, extractNodesIdFromContents(convertedExps.value))),
                (forbbidenNames: string[]): Result<GraphContent[]> =>
                    bind(mapExptoContent(e, childrenIds[exps.indexOf(e)], union(forbbidenNames, forbbidenIds)), 
                        (exp: GraphContent): Result<GraphContent[]> => 
                            makeOk(union(convertedExps.value, [exp]))))
            
        , makeOk([]), exps);

//Called from mapProgramtoMermaid and mapCompoundExpToContent and changeRootToNodeDecl//
export const joinEdges = (graphs: GraphContent[]) : Result<CompoundGraph> => 
    makeOk(makeCompoundGraph(chain((exp: GraphContent) : Edge[] => 
                                isCompoundGraph(exp) ? exp.edge : []
                            ,graphs)));

//Called from mapExpToMermaid//
export const changeRootToNodeDecl = (graph: CompoundGraph, label: string): Result<CompoundGraph> => 
    safe2((root: Node, edge: Edge[]) => 
    joinEdges(
        [makeCompoundGraph([makeEdge(makeNodeDecl(root.id, label),
                                    first(edge).to,
                                    first(edge).label)]),
        makeCompoundGraph(rest(edge))]))

    (getRoot(graph), makeOk(graph.edge));

//Called from changeRootToNodeDecl// 
export const getRoot = (graph: GraphContent) : Result<Node> => 
    isCompoundGraph(graph) ? makeOk(graph.edge[0].from) :
    isAtomicGraph(graph) ? makeOk(graph) :
    makeFailure("getRoot: Failed");
    
//Called from mapProgramtoMermaid and mapExpToMermaid and mapCompoundExpToContent//
export const renameVars = (vars: string[], forbbidenNames: string[]): string[] => {
    const setOfVars = union([], vars);

    const varGens = map((x: string): (v: string) => string => 
                            makeVarGen(), setOfVars);

    const upperCaseFirstLetter = (s: string) : string => 
        s.charAt(0).toUpperCase() + s.substring(1);

    const renameVar = (s: string): string => {
        const pos = setOfVars.indexOf(s);
        const varGen = varGens[pos];
        const tempName = ["number", "string", "boolean"].includes(s) ? varGen(s) :
                        upperCaseFirstLetter(varGen(s));
        return forbbidenNames.indexOf(tempName) !== -1 ? renameVar(s) : tempName;
    };

        return map(renameVar, vars);
    };

//Called from renameVars//
export const makeVarGen = (): (v: string) => string => {
    let count: number = 0;
    return (v: string) => {
        count++;
        return `${v}_${count}`;
    };
};
//Called from mapCompoundExpToContent//
export const extractTag = (x: Exp | SExpValue) : string =>
    isExp(x) ? x.tag :
    isSymbolSExp(x) ? x.tag :
    isEmptySExp(x) ? x.tag :
    isCompoundSExp(x) ? x.tag : 
    isVarDecl(x) ? x.tag :
    isBinding(x) ? x.tag :
    isNumber(x) ? "number" :
    isString(x) ? "string" :
    isBoolean(x) ? "boolean" : "";

//Called from convertValues//
export const extractNodesIdFromContents = (contents: GraphContent[]) : string[] =>
    chain((x: string[]): string[] => x, 
        map((exp: GraphContent): string[] => 
            isCompoundGraph(exp) ? extractNodesIdFromEdges(exp.edge) : [exp.id] ,contents));

//Called from extractNodesIdFromContents//          
export const extractNodesIdFromEdges = (edge: Edge[]) : string[] =>
    union(map((e: Edge): string => e.from.id, edge), 
        map((e: Edge): string => e.to.id, edge));