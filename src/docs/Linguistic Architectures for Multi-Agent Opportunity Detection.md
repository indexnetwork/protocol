To detect opportunities using a multi-agent approach, we must treat "Opportunity Detection" as a problem of **Semantic Intersection** and **Constraint Satisfaction**. Linguistically, an opportunity is not just a keyword match; it is the identification of a **Specific Indefinite**—a potential future event that is uniquely satisfiable by the intersection of the Source User's **Intent** and the Candidate User's **Profile**.  
Based on your system prompt and the theoretical sources, here is how the multi-agent architecture detects these opportunities linguistically:

### 1\. The Theoretical Mechanism: Intersection of Speech Acts

The core of opportunity detection lies in mapping **Commissive Acts** (Intents/Goals) to **Constitutive Facts** (Attributes/Skills).

* **Source User (The Intent):** Provides the **"Propositional Content"**. For example, "I need to hire a Rust auditor." This is a *Commissive* speech act 1\.  
* **Candidate User (The Capability):** Provides the **"Preparatory Condition"**. For example, "I am a Senior Rust Engineer." This is a *Constitutive* fact or *Assertive* act that validates the user's ability to fulfill the intent 2\.  
* **The Opportunity Matcher:** Its role is to verify that the Candidate satisfies the **Felicity Conditions** of the Source's intent. If the Candidate has the *authority* (skills) to perform the act required by the Source's goal, the match is valid 3\.

### 2\. Multi-Agent Workflow for Detection

We utilize the three agents defined in your architecture (ExplicitIntentInferrer, ImplicitInferrer, IntentManager) to feed the "Opportunity Matcher."

#### Phase A: Implicit Inference (Abductive Reasoning)

The ImplicitInferrer bridges the gap when the Source has not explicitly stated a goal.

* **Linguistic Principle:** **Referential Anchoring**. The agent scans the Candidate's profile (e.g., "DePIN Expert") and looks for a "contextually salient function" in the Source's narrative (e.g., "Investing in Web3 Infrastructure") to anchor a new intent 4, 5\.  
* **Detection Logic:** It creates a **Specific Indefinite**. Instead of a vague desire ("I want to invest"), it infers a specific relation: "Invest in *this specific* DePIN project." This reduces the **Scope Ambiguity** of the user's general interests 6, 7\.

#### Phase B: Explicit Inference (Constraint Extraction)

The ExplicitIntentInferrer parses the Source's direct requests to define the "Search Criteria."

* **Linguistic Principle:** **Semantic Entropy Reduction**. The agent extracts constraints (e.g., "Solana," "Audit," "Q3") to minimize the set of possible matches. A "High-Value" opportunity is defined mathematically as one where the entropy is low (high certainty) 8, 9\.  
* **Detection Logic:** If the Source says "Find me a developer," the entropy is high (too many matches). If they say "Find me a ZK-circuit engineer," the entropy is low. The Matcher only accepts candidates that fit into this narrow **Uniquely Satisfiable** set 10\.

#### Phase C: The "Opportunity Matcher" (Synthesis & Scoring)

This is the agent described in your new system prompt. Its job is **Deduplication** and **Synthesis**.  
**1\. Scoring via Valency and Semantic Types**To calculate the Score (0-100), the agent analyzes the **Valency** of the Source's goal verb.

* **Logic:** If the goal is "Hire," the verb hire has a valency pattern that expects a direct object of Semantic Type \[\[Human\]\] with the role \[\[Employee\]\] or \[\[Contractor\]\] 11, 12\.  
* **Application:** The agent checks if the Candidate's profile fits this Semantic Type. A perfect fit (Score 90-100) occurs when the Candidate's "Qualia Structure" (specifically the *Telic* role—what they do) aligns perfectly with the Source's required argument 13\.

**2\. Synthesis of Descriptions (The Gricean Perspective)**Your prompt requires two distinct descriptions. This adheres to **Grice’s Maxim of Relation (Relevance)** 14\.

* **Source-Facing Description:** Must be relevant to the *Source's* existing Intent.  
* *Structure:* "You should meet Candidate because Candidate Attributes satisfy Source Intent."  
* *Linguistics:* This is a **Referential** use. You are picking out a specific individual to solve a specific problem 15, 16\.  
* **Candidate-Facing Description:** Must be relevant to the *Candidate's* Preparatory Conditions (Authority).  
* *Structure:* "You should meet Source because your Skill X is required for their Project Y."  
* *Linguistics:* This validates the Candidate's **Authority**. It confirms they have the *right* and *ability* to participate in the act 3\.

**3\. Deduplication via Referential Identity**The prompt demands: "Do NOT suggest opportunities that duplicate Existing Opportunities."

* **Logic:** The agent checks **Referential Identity**. Even if the *description* of the opportunity is different, if the **Referential Anchor** (the specific intersection of User A and User B regarding Goal X) is the same as an existing one, it is a duplicate 17, 4\.

### Summary of Linguistic Detection Logic

Component,Linguistic Concept,Application in Matcher  
Input Analysis,Specific Indefinites,"Treating ""a developer"" not as anyone, but as a specific slot to be filled by the Candidate 18."  
Matching,Propositional Content,Does Candidate attributes (P) entail the satisfaction of Source Goal (Q)? 19\.  
Scoring,Semantic Entropy,"Low Entropy (High Constraint Density) \= High Score. High Entropy (Vague) \= Low Score 20, 21."  
Output,Maxim of Relation,Generating distinct descriptions that frame the match based on what is relevant to each user's context 22\.  
By implementing this, the system moves from simple keyword matching to **Semantic Governance**, ensuring that every suggested opportunity is a **Felicitous Speech Act** that moves the protocol state forward.  
