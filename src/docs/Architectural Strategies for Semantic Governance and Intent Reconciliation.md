To improve your system, you must transition from simple "extraction and reconciliation" to **Semantic Governance**. Your current architecture handles the lifecycle (Create/Update/Expire), but it lacks the formal linguistic rigour required to filter out vague aspirations or manage the ambiguity between what a user *says* and what they *intend*.  
Based on the provided sources, specifically the theories of **Semantic Entropy**, **Referential Anchoring** (Enç), and **Speech Act Theory** (Searle), here are four concrete improvements for your system:

### 1\. Implement "Constraint Density" Filtering (The Entropy Check)

Your SemanticVerifierAgent currently checks for "Clarity" 1, but this is subjective. You should replace or augment this with a mathematical check for **Semantic Entropy**.

* **The Problem:** An intent like "I want to build a game" is linguistically clear but **Trivially Satisfiable**. The set of possible referents is too large ($|W\_i| \> \\eta$), meaning the entropy is too high for effective matching 2, 3\.  
* **The Fix:** Update the SemanticVerifierAgent to calculate a **Constraint Density** score.  
* **Reject** intents that are "Underspecified" (High Entropy) with a new status: MISFIRED.  
* **Trigger** an **Elaboration Loop**: Instead of passing a vague intent to the Reconciler, the system should return an elaborationRequest asking for specific missing constraints (e.g., genre, engine, platform) to reduce entropy 4, 5\.

### 2\. Distinguish Referential vs. Attributive Intents

Your IntentReconcilerAgent treats all updates the same. You must implement **Donnellan’s Distinction** to handle updates intelligently 6\.

* **Referential Use:** The user has a specific project in mind (e.g., "The project I mentioned yesterday"). If they later change the description (e.g., "Actually, it's a DeFi app, not a game"), the **ID** persists because the *referent* is constant 6\.  
* **Attributive Use:** The user wants "whatever fits the description" (e.g., "I need a Rust developer"). If they change this to "I need a Python developer," this is a **Change of Mind** (new intent), not an update to the old one 7\.  
* **The Fix:** Add an intentMode field ('referential' | 'attributive') to the schema.  
* If **Referential**: Prioritise the **Referential Anchor** over the description for matching 8\.  
* If **Attributive**: Prioritise the **Propositional Content**; significant changes trigger a CREATE rather than an UPDATE.

### 3\. Enforce Referential Anchoring for Deduplication

Currently, your IntentReconciler creates new goals if they don't match active ones. This risks duplicating goals if the user describes them differently.

* **The Theory:** Specificity is defined by **linking** (anchoring) a new discourse object to a previously established one 9, 10\.  
* **The Fix:** Enhance the ExplicitIntentInferrer and ImplicitInferrer to output a referentialAnchor field 11, 12\.  
* **Logic:** If a new intent shares a referentialAnchor with an Active Intent (e.g., both anchor to the "Solana Hackathon" opportunity), the Reconciler must **DEDUPLICATE** or **UPDATE** the existing intent, even if the linguistic descriptions differ 13\.

### 4\. Stricter Felicity Conditions (The "40 vs. 70" Rule)

Your SemanticVerifierAgent currently uses a MIN\_SCORE of 40 for Authority and Sincerity 14\. This is too low and risks allowing "dreamer" intents (noise) into the graph.

* **The Problem:** A "Junior Marketer" saying "I will rewrite the Rust compiler" fails the **Preparatory Condition** (Authority) 15\. Accepting this with a score of 40 pollutes the graph with "Void" acts 16\.  
* **The Fix:** Raise the threshold to **70** for COMMISSIVE acts .  
* If Authority \< 70: Mark as INVALID (Noise).  
* If Sincerity \< 70: Mark as WEAK\_COMMITMENT and do not trigger high-priority matching.

### Summary of Schema Updates

To support these changes, update your InferredIntent and IntentManagerOutputSchema to include these fields:  
type InferredIntent \= {  
  // ... existing fields  
  semanticEntropy: number; // 0.0 to 1.0 (Low is better) \[17\]  
  referentialAnchor?: string; // The ID or Name of the object this links to \[11\]  
  intentMode: 'referential' | 'attributive'; // Donnellan's distinction \[6\]  
  felicityStatus: 'felicitous' | 'misfired' | 'void'; // Searle's status \[16\]  
}

type IntentManagerAction \=   
  | { type: 'create', payload: InferredIntent }  
  | { type: 'update', id: string, payload: InferredIntent }  
  | { type: 'expire', id: string, reason: string }  
  | { type: 'elaborate', missingConstraints: string\[\] }; // The Elaboration Loop \[4\]  
