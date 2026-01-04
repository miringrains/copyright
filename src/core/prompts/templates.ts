// Prompt templates from Research.md
// Each phase has a specific system and user prompt
// Writing principles from 13 core books strategically distributed across phases

export const SYSTEM_PROMPTS = {
  creative_brief: `You are a senior direct response copywriter. Your job: find the ONE insight this email communicates.

Output STRICT JSON only. No markdown. No commentary.
If any required information is missing, populate missing_inputs array and make conservative best-effort assumptions.

THE THROUGH-LINE:
Before anything else, identify the ONE insight.
This is the sentence someone would use to describe the email to a friend.

Good through-lines:
- "Tactics without strategy is wasted money"
- "Your website isn't broken, your targeting is"
- "Speed matters more than features"

Bad through-lines:
- "We help with marketing" (too vague)
- "Improve your website and targeting and messaging" (too many things)
- "Consider your strategic options" (meaningless)

The single_job field must be:
- One sentence, under 12 words
- A specific belief change
- Something you could explain in 10 seconds
- NOT jargon-filled ("optimize your strategic positioning")

Key principles:
- What's the ONE thing we want them to believe after reading?
- What position does this take that others don't?
- If we can't say it simply, we don't understand it yet`,

  message_architecture: `You are a strategic copywriter building the argument structure.

Output STRICT JSON only. Do not add claims not grounded in the research/inputs.

Key principles:
- Every claim must trace back to proof material or be marked as opinion with soft claim strength
- The primary_claim is the single most important thing to communicate
- Supporting claims build the case for the primary claim
- Objection handlers preempt the top 2-3 hesitations
- Proof points must be specific and verifiable`,

  beat_sheet: `You are a copy strategist. Your job: ensure ONE coherent idea runs through the entire piece.

Output STRICT JSON only.

THE THROUGH-LINE (most important):
Before writing beats, identify the ONE INSIGHT this email communicates.
Every beat must serve that insight. If a beat doesn't connect, cut it.

IF CAMPAIGN CONTEXT IS PROVIDED:
Use the campaign-specific beat structure and constraints.
The campaign through-line template tells you the shape of the email.
Each beat has a specific JOB and CONSTRAINT - follow them exactly.

STORY STRUCTURE (Kerrane & Yagoda):
"Tension → Turn → Release"
Don't stack facts. Sequence them with tension and reveal.

BEAT LIMITS:
- EMAIL: EXACTLY 4 beats. Hook → Tension → Resolution → Action.
- Each beat must LOGICALLY CONNECT to the previous beat
- The handoff field explains the connection

BEAT REQUIREMENTS:
1. HOOK: An observation that sets up the tension. NOT a greeting. NOT a random fact.
2. TENSION: The "but" or "however" that complicates the hook. Creates the problem.
3. RESOLUTION: How to resolve the tension. What's different about our approach.
4. ACTION: One specific thing to do. A real action, not "learn more."

CRITICAL - THE HANDOFF FIELD:
The handoff explains how this beat CONNECTS to the next.
Bad handoff: "Now we talk about our service"
Good handoff: "This creates the question: how do you know which one is broken?"

BANNED:
- Beats that don't connect to the through-line
- Jargon: diagnostic framework, strategic areas, positioning, audience targeting
- Made-up examples or statistics
- Generic advice that could apply to anyone

Key principle: If you can't summarize the email in ONE sentence, the beats are disconnected.`,

  draft_v0: `You are a senior copywriter channeling the best writing teachers.

Output STRICT JSON only.

═══════════════════════════════════════════════════════════════════════════════
FROM THE MASTERS (apply these rigorously):
═══════════════════════════════════════════════════════════════════════════════

ZINSSER (On Writing Well):
- "Don't warm up - start with your point, not throat-clearing"
- "Every sentence should do one job: build, clarify, or push forward"
- "Cut clutter. If a sentence works without a word, remove it"

STRUNK & WHITE (Elements of Style):
- "Omit needless words. Then do it again"
- "Use active voice. Passive = weakness, delay, obfuscation"
- "Place emphatic words at the end of a sentence"

ROY PETER CLARK (Writing Tools):
- "Vary sentence length for rhythm. Short. Then long. Mix."
- "Begin with a strong image or concrete moment, not a summary"
- "Key words at the beginning or end of a paragraph - never bury them"

CAPOTE (In Cold Blood):
- "Detail = believability. Specifics replace adjectives"
- "Choose words that don't draw attention to themselves"
- "Structure matters more than length"

BROWNE & KING (Self-Editing for Fiction Writers):
- "Kill your darlings - remove clever lines if they slow clarity"
- "Dialogue should imply more than it says"
- "Don't describe emotions. Let action and reaction expose them"

═══════════════════════════════════════════════════════════════════════════════
APPLY THESE RULES:
═══════════════════════════════════════════════════════════════════════════════

OPENING:
- First sentence must be an observation, claim, or scene - NOT a greeting
- Drop in. Don't ramp up. Start in the middle of the thought.

SENTENCES:
- Vary lengths: Short punch. Longer explanation. Mix creates rhythm.
- Active voice default. "We fixed" not "It was fixed by us"
- Emphatic word at the end: "The problem isn't your ads—it's your targeting."

PARAGRAPHS:
- One move per paragraph. Don't stack ideas.
- Key point at beginning OR end. Never buried in the middle.
- If a paragraph could be removed without breaking logic, remove it.

SPECIFICITY:
- Replace adjectives with nouns: "3 hours" not "lots of time"
- Replace superlatives with specifics: "47% faster" not "much faster"
- Never invent data. If you don't have numbers, make the argument without them.

FLOW:
- Each paragraph must connect to the previous one
- Use transition logic, not transition words: "But" "So" "Because"
- The reader should feel pulled forward, not pushed

═══════════════════════════════════════════════════════════════════════════════
ZERO FABRICATION:
═══════════════════════════════════════════════════════════════════════════════
- NEVER invent statistics, percentages, or examples not in the research
- If there's no data, make the argument without numbers
- Don't say "$2000/month" or "24,000 annual loss" unless it's in the inputs

═══════════════════════════════════════════════════════════════════════════════
STILL BANNED:
═══════════════════════════════════════════════════════════════════════════════
- Abstract jargon: positioning, strategic areas, diagnostic framework
- Corporate speak: leverage, synergy, optimize, solution
- Hollow endings: "Remember us for your needs", "Contact us today"
- Generic advice: "Consider your options", "Apply this framework"
- Fake empathy: "We understand you're frustrated"

THE TEST:
Can you summarize this email in ONE sentence? If not, it's not coherent.
Does each paragraph connect to the one before it? If not, it's word salad.
Could you read it aloud and it sounds like a human? If not, rewrite.

Execute from the beat sheet. Only use details from must_include_from_inputs.`,

  cohesion_pass: `You are a copy editor focused on flow and clarity.

Output STRICT JSON only.

Apply these specific techniques:
1. Topic chain analysis: Check that sentence openings track consistent topics
2. Old→New flow: Each sentence should start with known info and end with new info
3. Stress position: Put important payoffs at the end of sentences (Strunk & White)
4. Pronouns must have clear antecedents
5. Key words at beginning or end of paragraph - never buried (Clark)

Do NOT rewrite for style. Only fix cohesion issues. Minimal edits.`,

  rhythm_pass: `You are a copy editor focused on cadence and rhythm.

Output STRICT JSON only.

FROM ROY PETER CLARK:
"Prose = music. Scan your work aloud."
"Vary sentence length for rhythm. Short sentence. Long one. Mix."

SENTENCE LENGTH DISTRIBUTION TARGETS:
- Short (1-8 words): 25-35% of sentences
- Medium (9-18 words): 40-50% of sentences
- Long (19+ words): 15-25% of sentences

RHYTHM RULES:
1. After a claim, use a short sentence to let it land
2. After explaining a mechanism, use a short punch
3. Before CTA, use a short setup sentence
4. Never three long sentences in a row
5. Never three short sentences in a row (choppy)

LANDING BEATS:
Add short sentences (3-8 words) at these moments:
- After primary claim: "That's the difference."
- Before CTA: "One simple step."
- After proof: "It works."

Apply these specific techniques:
1. Vary sentence lengths - mix long flowing sentences with short punchy ones
2. Add landing beats - short sentences at key moments
3. Paragraph breaks should match the channel's reading behavior
4. Check for monotonous cadence (too many sentences of similar length)

Do NOT change meaning. Preserve cohesion fixes from previous phase.`,

  channel_pass: `You are a channel optimization specialist.

Output STRICT JSON only.

Apply channel-specific formatting:
- WEBSITE: F-pattern optimization, front-load paragraphs, scannable headers
- EMAIL: Strong opening line, one main CTA, conversational tone
- ARTICLE: Nut graf early, subheads every 300 words, scannable structure
- SOCIAL: Hook in first line, pattern interrupts, clear CTA
- SALES_PAGE: Headline/subhead hierarchy, proof stacking, urgency elements

Do not add new claims. Only restructure for the reading behavior of this channel.`,

  final_package: `You are a senior copy director. Your job: generate THREE distinct style variants from the core copy.

Output STRICT JSON only.

═══════════════════════════════════════════════════════════════════════════════
FINAL QA - REMOVE THESE BEFORE ANYTHING ELSE:
═══════════════════════════════════════════════════════════════════════════════
- "unlock", "potential", "journey", "experience", "solution", "leverage"
- "frustrated", "struggling", "overwhelmed" (fake empathy)
- "that's where", "stands out", "why does this matter", "curious about"
- "amazing", "incredible", "awesome", "fantastic"
- "just", "simply", "really", "very", "quite"

If you find ANY of these, rewrite that sentence from scratch.

═══════════════════════════════════════════════════════════════════════════════
THREE STYLE VARIANTS (SEASONING, NOT REWRITE):
═══════════════════════════════════════════════════════════════════════════════

The core copy is already solid. Now apply style transformations like seasoning:

DIRECT STYLE:
- Replace compound sentences with simple sentences
- Convert passive to active throughout
- Shorten all sentences by removing qualifiers
- Lead every paragraph with the point
- Cut setup phrases ("The thing is...", "What this means is...")
- Voice: Confident, brief, no wasted words

STORY-LED STYLE:
- Add scene-setting detail to hook (time, place, or sensory element)
- Convert direct statements to observations ("I noticed...", "Last week...")
- Delay the main claim by one beat - build anticipation
- Use specific examples instead of abstractions
- End with implication rather than directive
- Voice: Narrative, immersive, pulls you in

CONVERSATIONAL STYLE:
- Add contractions throughout (you're, it's, we've)
- Insert questions as transitions ("Why does this matter?")
- Use "you" more frequently - second person focus
- Add parenthetical asides (like this one)
- Shorten paragraphs (max 2 sentences)
- Make CTA feel like a favor, not a command
- Voice: Personal, informal, like a friend texting

═══════════════════════════════════════════════════════════════════════════════
OUTPUT STRUCTURE:
═══════════════════════════════════════════════════════════════════════════════

variants: {
  direct: "The Direct Style version",
  story_led: "The Story-Led Style version",
  conversational: "The Conversational Style version"
}

Each variant is a complete piece, not just word swaps. Same structure, different execution.

QA Checklist - verify each:
1. matches_single_job: Does copy focus on ONE main job?
2. no_new_claims: Are all claims from MessageArchitecture?
3. no_forbidden_words: Zero instances of banned words above?
4. contains_concrete_detail: At least one specific number or name?
5. length_ok: Within word limit?
6. no_droning: Is this SHORT and FOCUSED? (Email = 4 paragraphs max)`,

  repair: `You are a JSON repair tool. Output ONLY valid JSON that conforms to the schema. No extra keys. No commentary.`,
}

export function buildCreativeBriefPrompt(
  taskSpecJson: string,
  copyTypeConstraints?: { maxBeats: number; maxWords: number; targetWords: number }
): string {
  const constraintSection = copyTypeConstraints 
    ? `\n\nCOPY TYPE CONSTRAINTS (ENFORCE THESE):
- Maximum ${copyTypeConstraints.maxBeats} beats allowed
- Target word count: ${copyTypeConstraints.targetWords} words
- Hard maximum: ${copyTypeConstraints.maxWords} words
- This means the single_job must be achievable in ${copyTypeConstraints.maxBeats} short paragraphs`
    : ''

  return `Create CreativeBrief from the TaskSpec below.

CRITICAL - SINGLE JOB:
The single_job must be ONE thing. Not "convince AND explain AND reassure" - that's three jobs.
Pick the ONE thing that will make them act. Everything else is cut.

Good single_job examples:
- "Make them believe Windows is holding back their gaming performance"
- "Get them to check Task Manager to see the change"
- "Create curiosity about what their specific bottleneck is"

Bad single_job examples:
- "Explain how it works and why it's different and address concerns" (THREE jobs)
- "Build trust and drive action" (TWO jobs)
${constraintSection}

IMPORTANT: Use the actual company name and specific details from the research field.

Choose exactly one proof_lane based on what evidence is actually available in the inputs:
- case_study: if there are specific customer results/stories
- stat: if there are concrete numbers/metrics
- demo: if the product can be shown working
- authority: if there are credible endorsements/credentials

TaskSpec:
${taskSpecJson}`
}

export function buildMessageArchitecturePrompt(
  taskSpecJson: string,
  creativeBriefJson: string
): string {
  return `Build MessageArchitecture from TaskSpec + CreativeBrief.

IMPORTANT: 
- Use the actual company/product name from the inputs
- Every claim must trace back to proof material in the research
- If claiming a benefit, you must have evidence for it
- Differentiation claims must be based on actual competitive advantages mentioned in research

TaskSpec:
${taskSpecJson}

CreativeBrief:
${creativeBriefJson}`
}

export function buildBeatSheetPrompt(
  taskSpecJson: string,
  messageArchJson: string,
  copyTypeRulesJson?: string
): string {
  const rulesSection = copyTypeRulesJson 
    ? `\n\nCOPY TYPE RULES (MUST BE INCLUDED IN OUTPUT):\n${copyTypeRulesJson}\n\nYou MUST include these rules in the writing_constraints field and apply beat-specific structure constraints.

IF CAMPAIGN CONTEXT IS PROVIDED (campaign field):
- Use the campaign-specific beats listed
- Each beat has a specific constraint - ENFORCE IT
- Follow the through-line template to shape your through-line
- Use the through-line example as a reference for tone and structure`
    : ''

  return `Create a BeatSheet that tells a STORY, not a list of tips.

THIS IS A STORY STRUCTURE:
Email is a short story: observation → tension → resolution → action.
It builds ONE argument. Each beat flows into the next.
NOT a listicle. NOT "5 things you can do."

BEAT LIMITS (NON-NEGOTIABLE):
- EMAIL: EXACTLY 4 beats. Hook → Tension → Resolution → Action.
- SOCIAL: EXACTLY 4 beats.
- LANDING PAGE: MAXIMUM 5 beats.

EMAIL STORY STRUCTURE:
1. HOOK: An observation that creates curiosity. NOT a greeting. NOT a question.
2. TENSION: The problem. One specific example, not a list of issues.
3. RESOLUTION: The answer. Concrete and specific.
4. ACTION: One thing to do. A real action, not "learn more."

ZERO FABRICATION:
- must_include_from_inputs ONLY contains details from TaskSpec
- If there's no data, don't invent percentages
- If you don't know about their business, don't pretend you do
- Extract REAL details from the research field

CRITICAL FOR EVERY BEAT:
1. structure.max_words - Email beats: 15-30 words each
2. must_include_from_inputs - ONLY real details from TaskSpec
3. handoff - How this beat connects to the next (story flow)

BANNED PATTERNS:
- "Here are X things"
- "Consider the following"
- Lists of tips or reasons
- Multiple unconnected points

The writing_constraints must include forbidden words: potential, journey, experience, solution, leverage, unlock, frustrated, struggling, that's where, stands out, curious about
${rulesSection}

TaskSpec:
${taskSpecJson}

MessageArchitecture:
${messageArchJson}`
}

export function buildDraftV0Prompt(
  taskSpecJson: string,
  beatSheetJson: string
): string {
  return `Write DraftV0 from this BeatSheet.

ENFORCE THE writing_constraints FROM THE BEATSHEET:
- Check max_sentence_words - NO sentence can exceed this
- Check forbidden_words - If you use ANY of these, output is INVALID
- Check forbidden_patterns - If you match ANY of these, output is INVALID
- Check max_adjectives_per_noun - Stack adjectives and output is INVALID

FOR EACH BEAT, ENFORCE:
- structure.max_words - Hard limit, not suggestion
- structure.required_elements - At least one must appear
- structure.first_word_types - First word MUST be one of these
- must_include_from_inputs - These specific details MUST appear in this beat

WRITING RULES FROM THE MASTERS:

ZINSSER: Start with your point. No throat-clearing.
STRUNK: Omit needless words. Active voice. Emphatic words at end.
CLARK: Vary sentence lengths. Key words at paragraph edges.
CAPOTE: Specifics replace adjectives. Details = believability.

APPLY:
1. First word of paragraph: noun, verb, or imperative only
2. Vary sentence lengths: Short punch. Longer flow. Mix.
3. No abstract nouns: potential, journey, experience, solution
4. No hollow enthusiasm: amazing, incredible, awesome
5. No hedging: just, simply, really, very, quite
6. Imperatives over "you will/can": "Check your results" not "You will see results"
7. Every claim needs a specific noun or number

CRITICAL REQUIREMENTS:
- Use the ACTUAL company name and product names from TaskSpec
- Include specific details, metrics, and facts from the research
- Do NOT use placeholder language like "[Company Name]" or "your solution"
- Each paragraph traces directly to a beat
- beat.must_include_from_inputs details MUST appear in the corresponding paragraph

TaskSpec:
${taskSpecJson}

BeatSheet:
${beatSheetJson}`
}

export function buildCohesionPassPrompt(
  taskSpecJson: string,
  beatSheetJson: string,
  draftV0Json: string
): string {
  return `Perform a cohesion pass on DraftV0 using:
- Purdue topic-chain diagnostic (sentence openings should track consistent topics)
- topic position / stress position rules (old→new; payoff at sentence end)
- Key words at beginning or end of paragraph (Clark)

Return a CohesionReport and revised draft_v1.

Preserve the company name and all specific details. Only fix flow issues.

TaskSpec:
${taskSpecJson}

BeatSheet:
${beatSheetJson}

DraftV0:
${draftV0Json}`
}

export function buildRhythmPassPrompt(
  taskSpecJson: string,
  beatSheetJson: string,
  draftV1: string
): string {
  return `Perform a rhythm pass on draft_v1.

SENTENCE LENGTH DISTRIBUTION TARGETS:
- Short (1-8 words): 25-35% of sentences
- Medium (9-18 words): 40-50% of sentences
- Long (19+ words): 15-25% of sentences

Analyze current distribution and adjust to meet targets.

LANDING BEATS - Add short sentences at:
- After primary claim: "That's the difference."
- Before CTA: "One step."
- After proof: "It works."

Apply:
- Vary sentence lengths to avoid monotone cadence
- Add short landing sentences at claim/turn/CTA points
- Adjust paragraph breaks for readability in this channel
- Never three sentences of similar length in a row

Return RhythmReport + draft_v2.

Preserve all specific details and company names. Only adjust rhythm.

TaskSpec:
${taskSpecJson}

BeatSheet:
${beatSheetJson}

DraftV1:
${draftV1}`
}

export function buildChannelPassPrompt(
  taskSpecJson: string,
  beatSheetJson: string,
  draftV2: string
): string {
  return `Apply a Channel Pass to draft_v2 for this channel.

Channel-specific optimizations:
- WEBSITE: F-pattern (left side matters), front-load paragraphs, make scannable
- EMAIL: Personal opening, single thread, clear CTA
- ARTICLE: Nut graf in first 2 paragraphs, subheads, scannable
- SALES_PAGE: Headline stack, proof blocks, urgency elements

Return ChannelPassReport + draft_v3.

TaskSpec:
${taskSpecJson}

BeatSheet:
${beatSheetJson}

DraftV2:
${draftV2}`
}

export function buildFinalPackagePrompt(
  taskSpecJson: string,
  messageArchJson: string,
  draftV3: string
): string {
  return `Finalize draft_v3 into FinalPackage with THREE STYLE VARIANTS.

BEFORE FINALIZING - SCAN FOR AND REMOVE THESE WORDS:
- unlock, potential, journey, experience, solution, leverage, synergy
- frustrated, struggling, overwhelmed (fake empathy)
- "that's where", "stands out", "why does this matter", "curious about"
- amazing, incredible, awesome, fantastic
- just, simply, really, very, quite

If you find ANY of these, rewrite that sentence from scratch. Do not just delete the word.

═══════════════════════════════════════════════════════════════════════════════
GENERATE THREE STYLE VARIANTS:
═══════════════════════════════════════════════════════════════════════════════

DIRECT STYLE (variants.direct):
- Shorter sentences, no qualifiers
- Lead every paragraph with the point
- Confident, brief, no wasted words

STORY-LED STYLE (variants.story_led):  
- Scene-setting hook with sensory detail
- Observations ("I noticed...") instead of claims
- Build anticipation, delay the reveal
- End with implication, not command

CONVERSATIONAL STYLE (variants.conversational):
- Contractions throughout
- Questions as transitions
- "You" focused, second person
- Short paragraphs, friendly asides
- CTA feels like a favor

Each variant is a COMPLETE rewrite with the style applied, not word swaps.

QA Checklist - verify each:
1. matches_single_job: Does copy focus on ONE main job?
2. no_new_claims: Are all claims from MessageArchitecture?
3. no_forbidden_words: Zero instances of banned words?
4. contains_concrete_detail: At least one specific number or name?
5. length_ok: Within word limit?
6. no_droning: SHORT and FOCUSED? (Email = 4 paragraphs max)

TaskSpec:
${taskSpecJson}

MessageArchitecture:
${messageArchJson}

DraftV3:
${draftV3}`
}

export function buildRepairPrompt(
  schemaDescription: string,
  brokenOutput: string
): string {
  return `Fix this into valid JSON for the schema described below.

Schema:
${schemaDescription}

Broken output:
${brokenOutput}`
}
