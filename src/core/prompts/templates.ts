// Prompt templates from Research.md
// Each phase has a specific system and user prompt

export const SYSTEM_PROMPTS = {
  creative_brief: `You are a senior writer. Output STRICT JSON only. No markdown. No commentary.
If any required information is missing, set "missing_inputs" and keep other fields best-effort but conservative.`,

  message_architecture: `Output STRICT JSON only. Do not add claims not grounded in TaskSpec inputs/proof_material.`,

  beat_sheet: `Output STRICT JSON only. Beats must cover the entire MessageArchitecture without adding new claims.
Each beat must include a handoff that makes the next beat feel inevitable.`,

  draft_v0: `Output STRICT JSON only. Write the draft exactly following the beats.
Do not invent facts. If proof material is missing, write with softer claim strength.`,

  cohesion_pass: `Output STRICT JSON only.
Do not rewrite for style. Rewrite only for cohesion and emphasis placement.
Use minimal edits that restore a clear topic chain and old→new flow.`,

  rhythm_pass: `Output STRICT JSON only.
Do not change meaning. Only adjust cadence, sentence length, and paragraphing.
Preserve the cohesion fixes from the previous phase.`,

  channel_pass: `Output STRICT JSON only.
Reformat and restructure ONLY as needed to fit the channel's reading behavior.
Do not add new claims.`,

  final_package: `Output STRICT JSON only.
If any QA item fails, fix the copy and set the QA item to true after fixing.`,

  repair: `You are a JSON repair tool. Output ONLY valid JSON that conforms to the schema. No extra keys.`,
}

export function buildCreativeBriefPrompt(taskSpecJson: string): string {
  return `Create CreativeBrief from TaskSpec below. Choose exactly one proof_lane and justify it briefly in risk_notes.

TaskSpec:
${taskSpecJson}`
}

export function buildMessageArchitecturePrompt(
  taskSpecJson: string,
  creativeBriefJson: string
): string {
  return `Build MessageArchitecture from TaskSpec + CreativeBrief. Ensure every claim has a proof_plan entry or is explicitly labeled as an opinion with soft claim strength.

TaskSpec:
${taskSpecJson}

CreativeBrief:
${creativeBriefJson}`
}

export function buildBeatSheetPrompt(
  taskSpecJson: string,
  messageArchJson: string
): string {
  return `Create a BeatSheet for the TaskSpec channel, using the MessageArchitecture below.

TaskSpec:
${taskSpecJson}

MessageArchitecture:
${messageArchJson}`
}

export function buildDraftV0Prompt(
  taskSpecJson: string,
  beatSheetJson: string
): string {
  return `Write DraftV0 from this BeatSheet. Respect length_budget hard_max.

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

Return a CohesionReport and revised draft_v1.

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
  return `Perform a rhythm pass on draft_v1:
- vary sentence lengths to avoid monotone cadence
- add short landing sentences at claim/turn/CTA points
- adjust paragraph breaks for readability in this channel

Return RhythmReport + draft_v2.

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
  return `Apply a Channel Pass to draft_v2 for this channel. Optimize for how people actually read on this surface.
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
  return `Finalize draft_v3 into FinalPackage. Enforce:
- no new claims beyond MessageArchitecture
- proof lane consistency
- at least one concrete detail and one constraint/tradeoff (unless impossible in TaskSpec; then explain in qa notes)

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

