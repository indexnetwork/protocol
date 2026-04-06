To support the **Semantic Governance** architecture we have defined, the database schemas must move beyond simple text storage to capture **logical satisfiability**, **linguistic specificity**, and **referential links**.  
Here is the recommended database schema design (presented in a Prisma-like syntax for readability), integrating the theoretical constraints from **Donnellan**, **Searle**, **Enç**, and **Shannon**. *Note: This is a conceptual schema; the live implementation uses Drizzle ORM in `protocol/src/schemas/database.schema.ts`.*

### 1\. Active Intent Schema (The Propositional Content)

This table stores the user's "Specific Indefinites"—goals that meet the **Minimum Specification Threshold**.  
model ActiveIntent {  
  id                String   @id @default(uuid())  
  userId            String  
    
  // 1\. The Propositional Content  
  // "Hire a formal verification specialist..."  
  payload           String   @db.Text   
    
  // 2\. Information Theoretic Metrics \[Shannon 1948\]  
  // Must be \< threshold (η) to be actionable.   
  // High entropy (e.g., 0.9) implies the intent is Trivially Satisfiable (useless).  
  semanticEntropy   Float    @default(1.0)   
    
  // 3\. Referential Anchoring \[Enç 1991\]  
  // Links the intent to a specific node in the User's Narrative or Identity.  
  // e.g., "Profile Narrative: DePIN Interest" or "Project ID: X"  
  referentialAnchor String?    
    
  // 4\. Donnellan's Distinction \[Donnellan 1966\]  
  // REFERENTIAL: The user has a specific thing in mind (ID persists even if description changes).  
  // ATTRIBUTIVE: The user wants "whoever fits the description" (Subject to strict logical matching).  
  intentMode        Enum     @default(ATTRIBUTIVE) // \['REFERENTIAL', 'ATTRIBUTIVE'\]  
    
  // 5\. Speech Act Classification \[Searle 1969\]  
  // Only COMMISSIVE (goals) or DIRECTIVE (requests) are stored here.  
  speechActType     Enum     // \['COMMISSIVE', 'DIRECTIVE'\]  
    
  // 6\. Felicity Conditions (Governance)  
  // Scores (0-100) determining if the intent is valid.  
  felicityAuthority Int      // Preparatory Condition: Does user have the skill/right?  
  felicitySincerity Int      // Sincerity Condition: Is the commitment genuine?  
    
  status            Enum     @default(ACTIVE) // \['ACTIVE', 'PAUSED', 'FULFILLED', 'EXPIRED'\]  
  createdAt         DateTime @default(now())  
  updatedAt         DateTime @updatedAt  
}

### 2\. Opportunity Schema (The Semantic Intersection)

An opportunity is not just a match; it is a computed **Specific Indefinite** event where the **Constitutive Facts** of a candidate satisfy the **Propositional Content** of a source intent.  
model Opportunity {  
  id                String   @id @default(uuid())  
    
  // The Intersection  
  sourceIntentId    String   // The Commissive Act (The Demand)  
  targetUserId      String   // The Constitutive Authority (The Supply)  
    
  // 1\. Scoring & Entropy Reduction  
  // High score indicates high constraint density match (Uniquely Satisfiable).  
  matchScore        Int      @db.SmallInt // 0-100  
    
  // 2\. Valency Fit \[Hanks 2013\]  
  // How well the candidate fills the semantic argument slot of the source verb.  
  // e.g., Source "Hire" expects \[\[Human\]\], Target is \[\[Human\]\].  
  valencyRole       String   // e.g., "Agent", "Patient", "Instrument"  
    
  // 3\. Gricean Synthesis \[Grice 1975\]  
  // Two distinct descriptions adhering to the Maxim of Relation (Relevance).  
  descriptionForSource  String @db.Text // "You should meet X because \[Relation to Intent\]"  
  descriptionForTarget  String @db.Text // "You should meet Y because \[Relation to Skills\]"  
    
  // 4\. Governance  
  status            Enum     @default(PENDING) // \['PENDING', 'ACCEPTED', 'REJECTED'\]  
  rejectionReason   String?  // Feedback loop for the Implicit Inferred to learn.  
}

### 3\. Elaboration Request Schema (The Quantity Maxim Loop)

When an intent fails the **Minimum Specification Threshold** (Entropy \> $\\eta$), it is not stored as an intent. It creates an ElaborationRequest to enforce the **Maxim of Quantity**.  
model ElaborationRequest {  
  id                String   @id @default(uuid())  
  userId            String  
    
  // The Vague Segment (High Entropy)  
  // e.g., "I want to invest in crypto"  
  originalUtterance String   @db.Text  
    
  // Missing Constraints  
  // The specific attributes needed to reduce entropy.  
  // e.g., \["Target Sector", "Ticket Size", "Stage"\]  
  missingDimensions String\[\]   
    
  // The Directive  
  // The generated prompt asking the user to clarify.  
  systemPrompt      String   @db.Text  
    
  status            Enum     @default(OPEN) // \['OPEN', 'RESOLVED', 'ABANDONED'\]  
}

### 4\. User Profile Schema (The Constitutive Context)

This schema supports **Implicit Inference** by providing the "Constitutive Facts" required to bootstrap intents when explicit input is null (as seen in Test 5).  
model UserProfile {  
  userId            String   @id  
    
  // 1\. Narrative Identity  
  // Used for Referential Anchoring \[Enç 1991\].  
  bio               String   @db.Text  
  narrativeEmbedding Vector? // For vector search bridging  
    
  // 2\. Constitutive Attributes \[Searle 1969\]  
  // Facts that grant "Authority" to perform speech acts.  
  skills            String\[\] // e.g., \["Rust", "Solidity"\]  
  roles             String\[\] // e.g., \["Founder", "Investor"\]  
    
  // 3\. Implicit Goals  
  // Goals inferred purely from the profile, not yet articulated.  
  implicitIntents   Json?    // Cached results from ImplicitInferrer  
}

### Key Architectural Shifts

1. **Entropy as a Column:** By storing semanticEntropy on the ActiveIntent, you allow the matcher to prioritize "Hard" constraints (low entropy) over "Soft" desires (high entropy).  
2. **Dual-Mode Intents:** The intentMode (Referential/Attributive) flag tells the system whether to update the intent if the user changes the description (Referential) or treat it as a new/contradictory goal (Attributive).  
3. **Bilateral Relevance:** The Opportunity schema explicitly separates the "Why" for the Source and the "Why" for the Candidate, ensuring the **Maxim of Relation** is satisfied for both parties.

