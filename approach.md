# Anthropic's Prototype-First Approach

Anthropic engineers and teams ship features using a **"Prototype-First"** approach that prioritizes rapid iteration and internal dogfooding over traditional, lengthy planning cycles. Based on insights from their engineering blog and deep dives into features like Claude Artifacts, their process from high-level ideas to shipping typically follows these steps:

1. **Prototype-First (Skipping the PRD)**  
   Unlike many large tech companies that start with 10-page Product Requirement Documents (PRDs) and months of spec reviews, Anthropic often skips the formal spec phase. Engineers move directly from a high-level idea to a working prototype. They frequently use their own AI coding tools, like Claude Code, to accelerate this initial building phase.

2. **"WIP Wednesdays" Ritual**  
   A core part of their culture is a weekly ritual called **"WIP Wednesdays"**. During these sessions, engineers, designers, and researchers demo their work-in-progress. This creates a regular cadence for immediate, cross-functional feedback and helps surface the best ideas early without waiting for a "finished" product.

3. **Immediate Company-Wide Dogfooding**  
   Once a prototype is functional, it is often shipped internally to the **entire company** immediately. Instead of a small test group, everyone at Anthropic begins using the feature. This "internal launch" allows the team to gather both qualitative feedback and quantitative usage data at scale before any public release.

4. **"Swarm" Teams**  
   Major features (like Artifacts) are typically developed by small, **cross-functional teams** ("swarms") that include researchers, designers, and engineers working in a tight loop. This collaborative, highly agile "swarm" approach reduces bureaucratic friction and allows the team to iterate on the research (the AI model's behavior) and the product (the UI/UX) simultaneously.

5. **Iterative Refinement Based on Real Usage**  
   The decision to ship a feature publicly is driven by real-world usage patterns observed during internal dogfooding. The team refines the feature based on how employees *actually* interact with it, identifying edge cases and high-value improvements that weren't obvious at the "idea" stage.

6. **Using Their Own Tools**  
   Anthropic engineers are "power users" of their own products. By using Claude, Claude Code, and Artifacts to build the next version of Claude, they create a continuous feedback loop where the builders are the first to feel the friction points of the product they are shipping.
