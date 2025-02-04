
The dataflow is composed of 3 topologies of graphlet:
- source: composed of node with zero/one input and one output (shall be like pure function)
- function: composed of potential zero/multiple input and ouput (can have side effect, and be trigger by callback)
- operator: composed of zero/multiple input and one output (shall be like pure function)

Each topology have specicity in term of scheduling with asynchonous operation.
In a the case of dataflow for UI, the most used topologies are source & operator, it allows to make all simple view based on components bound to data sources.
