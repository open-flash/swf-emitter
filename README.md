# SWF Emitter

This library lets you convert an SWF Abstract Syntax Tree (as defined in `swf-tree`)
into bytes so you can save it into a file.

It guarantees the invariant `swfParser(swfEmitter(movieAst)) == movieAst`. If you find an
example where this invariant is broken, please fill an issue.

Because the bytes format is richer than the AST, it does not guarantee the reverse
order `swfEmitter(swfParser(movieBytes)) == movieBytes`.
