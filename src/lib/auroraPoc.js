const STORAGE_KEY = "aurora-poc.state.v1";

const DEPARTMENTS = ["Nettie", "Dana", "Torina", "Icky", "Funboy", "Van", "Perry"];

const DEMO_COMMANDS = [
  "What is the price per share of Microsoft today?",
  "Draft a short investor-facing paragraph explaining Aurora.",
  "Create a high-priority task to follow up with the investor packet tomorrow.",
  "Identify three business types that would benefit from Aurora.",
  "Would sending an email to an investor require approval?",
  "Draft an email to a potential investor introducing Aurora.",
  "Prepare a calendar meeting draft for an investor call next Tuesday at 10.",
  "Check whether the Aurora POC workflow has any failed nodes.",
];

const MODEL_GATEWAY = {
  finance: {
    task_type: "local_low_risk",
    intended_provider: "demo_provider",
    intended_model: "demo.finance.v1",
    actual_provider: "demo_provider",
    actual_model: "demo.finance.v1",
    reason_selected: "Read-only finance lookup is running in truthful demo mode because no live market provider is configured.",
    confidence: 0.96,
    limitations: ["No live finance API configured", "No price fabricated"],
  },
  content: {
    task_type: "premium_reasoning",
    intended_provider: "gpt_provider",
    intended_model: "gpt-5",
    actual_provider: "demo_provider",
    actual_model: "demo.content.v1",
    reason_selected: "Investor-facing copy should use premium reasoning; this POC renders a deterministic draft instead of calling a live model.",
    confidence: 0.89,
    limitations: ["Rendered locally", "No external model call performed"],
  },
  task: {
    task_type: "local_low_risk",
    intended_provider: "ollama_qwen_provider",
    intended_model: "qwen2.5",
    actual_provider: "demo_provider",
    actual_model: "demo.task.v1",
    reason_selected: "Task creation is a low-risk internal write and can be demonstrated deterministically.",
    confidence: 0.98,
    limitations: ["No persistent task backend connected"],
  },
  opportunity: {
    task_type: "cheap_cloud",
    intended_provider: "openrouter_provider",
    intended_model: "openrouter/auto",
    actual_provider: "demo_provider",
    actual_model: "demo.opportunity.v1",
    reason_selected: "Opportunity analysis is routed as a cheaper cloud class task, but this POC stays demo-safe.",
    confidence: 0.86,
    limitations: ["No live research provider called"],
  },
  risk: {
    task_type: "premium_reasoning",
    intended_provider: "gpt_provider",
    intended_model: "gpt-5",
    actual_provider: "demo_provider",
    actual_model: "demo.risk.v1",
    reason_selected: "Approval and risk questions should route through premium reasoning and Perry ownership.",
    confidence: 0.93,
    limitations: ["No external approval action taken"],
  },
  external_write: {
    task_type: "premium_reasoning",
    intended_provider: "gpt_provider",
    intended_model: "gpt-5",
    actual_provider: "demo_provider",
    actual_model: "demo.external-write.v1",
    reason_selected: "External writes are approval-gated and must remain draft-only in this POC.",
    confidence: 0.94,
    limitations: ["Draft mode only", "No email/calendar event sent"],
  },
  qa: {
    task_type: "local_low_risk",
    intended_provider: "ollama_qwen_provider",
    intended_model: "qwen2.5",
    actual_provider: "demo_provider",
    actual_model: "demo.qa.v1",
    reason_selected: "Workflow QA is a low-risk internal inspection task.",
    confidence: 0.97,
    limitations: ["No live executor attached"],
  },
  general: {
    task_type: "demo_mode",
    intended_provider: "demo_provider",
    intended_model: "demo.general.v1",
    actual_provider: "demo_provider",
    actual_model: "demo.general.v1",
    reason_selected: "General command routing is rendered in deterministic demo mode.",
    confidence: 0.88,
    limitations: ["Demo-only outcome"],
  },
};

function isoNow(offsetMs = 0) {
  return new Date(Date.now() + offsetMs).toISOString();
}

function createId(prefix) {
  const token = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${token}`;
}

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function routeFromCommand(command = "") {
  const lower = String(command).toLowerCase();

  if (/microsoft|share price|stock|ticker|market price|price per share/.test(lower)) {
    return {
      department: "Dana",
      agent: "Dana",
      intent: "market_data_lookup",
      template: "finance",
      risk_tier: "Tier 0",
      approval_required: false,
      ...MODEL_GATEWAY.finance,
    };
  }

  if (/email|calendar|meeting|schedule|send|approval|would sending/.test(lower)) {
    return {
      department: "Perry",
      agent: "Perry",
      intent: /calendar|meeting|schedule/.test(lower) ? "calendar_or_email_governance" : "approval_review",
      template: "external_write",
      risk_tier: /email|calendar|meeting|schedule|send/.test(lower) ? "Tier 2" : "Tier 0",
      approval_required: /send|email|calendar|meeting|schedule/.test(lower),
      ...MODEL_GATEWAY.external_write,
    };
  }

  if (/draft|write|paragraph|overview|blog|copy|investor-facing|investor overview/.test(lower)) {
    return {
      department: "Torina",
      agent: "Torina",
      intent: "content_draft",
      template: "content",
      risk_tier: "Tier 1",
      approval_required: false,
      ...MODEL_GATEWAY.content,
    };
  }

  if (/task|todo|remind|follow up|follow-up|checklist/.test(lower)) {
    return {
      department: "Icky",
      agent: "Icky",
      intent: "task_management",
      template: "task",
      risk_tier: "Tier 1",
      approval_required: false,
      ...MODEL_GATEWAY.task,
    };
  }

  if (/benefit|business types|opportunity|prospect|lead|segment|who would benefit|three business/.test(lower)) {
    return {
      department: "Funboy",
      agent: "Funboy",
      intent: "opportunity_scan",
      template: "opportunity",
      risk_tier: "Tier 0",
      approval_required: false,
      ...MODEL_GATEWAY.opportunity,
    };
  }

  if (/failed nodes|workflow|build|deploy|error|qa|status check|workflow status/.test(lower)) {
    return {
      department: "Van",
      agent: "Van",
      intent: "technical_qa",
      template: "qa",
      risk_tier: "Tier 0",
      approval_required: false,
      ...MODEL_GATEWAY.qa,
    };
  }

  return {
    department: "Nettie",
    agent: "Nettie",
    intent: "general_assistant",
    template: "general",
    risk_tier: "Tier 0",
    approval_required: false,
    ...MODEL_GATEWAY.general,
  };
}

function buildStep({
  jobId,
  workflowId,
  modelRunId,
  index,
  label,
  node_type,
  assigned_agent_or_skill_node,
  status,
  input,
  output,
  actor,
  tool_used,
  model_used,
  task_type,
  reason_selected,
  confidence,
  limitations,
  error = null,
}) {
  const nodeId = `${jobId}-n${index + 1}`;
  const startedAt = isoNow(index * 1000);
  const completedAt = status === "pending" ? null : isoNow(index * 1000 + 500);
  return {
    id: nodeId,
    workflow_id: workflowId,
    job_id: jobId,
    node_order: index + 1,
    label,
    node_type,
    assigned_agent_or_skill_node,
    status,
    input,
    output,
    started_at: startedAt,
    completed_at: completedAt,
    evidence_id: `${nodeId}-evidence`,
    error,
    provider_id: modelRunId,
    model_used,
    task_type,
    reason_selected,
    confidence,
    limitations,
    tool_used,
    actor,
  };
}

function buildEvidence(node, job, workflow, modelRunId) {
  return {
    id: node.evidence_id,
    job_id: job.id,
    workflow_id: workflow.id,
    node_id: node.id,
    actor: node.assigned_agent_or_skill_node,
    action: node.node_type,
    tool_used: node.tool_used,
    model_used: node.model_used,
    input_summary: String(node.input || job.original_command || "").slice(0, 240),
    result_summary: String(node.output || node.error || "").slice(0, 280),
    raw_output: JSON.stringify({
      node_id: node.id,
      workflow_id: workflow.id,
      job_id: job.id,
      model_run_id: modelRunId,
      status: node.status,
      output: node.output,
      error: node.error,
      limitations: node.limitations,
    }, null, 2),
    timestamp: node.completed_at || node.started_at,
  };
}

function templateSteps(route, command) {
  const financeBlocked = route.template === "finance";
  const sharedApprovedNote = route.approval_required
    ? "Governance required. Draft-only behavior is active; no external side effect was performed."
    : "Internal governance satisfied and evidence captured.";

  const contentOutput = "Aurora is a governed command center that routes work, stores evidence, and makes each decision visible.";
  const taskOutput = "Task created in demo state with a high-priority follow-up marker and a visible owner lane.";
  const opportunityOutput = "1) Professional services agencies 2) Solo consultants 3) Small operations teams that need a governed assistant.";
  const riskOutput = route.intent === "calendar_or_email_governance"
    ? "An email/calendar action would require approval. Draft mode is active and nothing was sent or created externally."
    : "Sending an email to an investor is approval-gated. The policy remains visible in Perry's lane.";
  const qaOutput = "Workflow inspected. No failures were found in the seeded Aurora POC state.";

  switch (route.template) {
    case "finance":
      return [
        { label: "Command Received", node_type: "command_intake", assigned: "Nettie", status: "completed", input: command, output: "Command recorded in Mission Control." , actor: "Nettie", tool_used: "command_console" },
        { label: "Nettie Classification", node_type: "intent_classification", assigned: "Nettie", status: "completed", input: command, output: `Intent: ${route.intent}. Routed to ${route.department}. Risk: ${route.risk_tier}.`, actor: "Nettie", tool_used: "deterministic_router" },
        { label: "Dana Finance Intake", node_type: "department_routing", assigned: "Dana", status: "completed", input: command, output: "Dana acknowledged the read-only finance lookup lane.", actor: "Dana", tool_used: "department_router" },
        { label: "Market Data Lookup", node_type: "tool_call", assigned: "Finance Provider", status: "blocked", input: command, output: "Live market provider unavailable in this POC. No share price was fabricated.", error: "demo_mode_only", actor: "Dana", tool_used: "finance_provider" },
        { label: "Timestamp / Source Validation", node_type: "validation", assigned: "Nettie", status: "completed", input: command, output: "Validation captured the absence of live source data and preserved the blocked state.", actor: "Nettie", tool_used: "source_validator" },
        { label: "Evidence Capture", node_type: "evidence_capture", assigned: "Mission Control", status: "completed", input: command, output: "Evidence log attached to the blocked market lookup.", actor: "Mission Control", tool_used: "evidence_store" },
        { label: "Return Answer to Nettie", node_type: "response_return", assigned: "Nettie", status: "completed", input: command, output: "Dana could not confirm Microsoft share price because live finance access is not configured; response returned in demo-safe mode.", actor: "Nettie", tool_used: "response_formatter" },
      ];

    case "content":
      return [
        { label: "Command Received", node_type: "command_intake", assigned: "Nettie", status: "completed", input: command, output: "Command recorded in Mission Control.", actor: "Nettie", tool_used: "command_console" },
        { label: "Nettie Classification", node_type: "intent_classification", assigned: "Nettie", status: "completed", input: command, output: `Intent: ${route.intent}. Routed to ${route.department}. Risk: ${route.risk_tier}.`, actor: "Nettie", tool_used: "deterministic_router" },
        { label: "Torina Intake", node_type: "department_routing", assigned: "Torina", status: "completed", input: command, output: "Torina received the investor copy request and opened the writing lane.", actor: "Torina", tool_used: "department_router" },
        { label: "Draft Paragraph", node_type: "agent_or_skill_execution", assigned: "Torina / Quill", status: "completed", input: command, output: contentOutput, actor: "Torina", tool_used: "draft_writer" },
        { label: "Polish Review", node_type: "validation", assigned: "Torina / Polish", status: "completed", input: command, output: "Polish review passed. Tone is investor-safe, concise, and routed through the brand review lane.", actor: "Torina", tool_used: "brand_reviewer" },
        { label: "Evidence Capture", node_type: "evidence_capture", assigned: "Mission Control", status: "completed", input: command, output: sharedApprovedNote, actor: "Mission Control", tool_used: "evidence_store" },
        { label: "Return Answer to Nettie", node_type: "response_return", assigned: "Nettie", status: "completed", input: command, output: contentOutput, actor: "Nettie", tool_used: "response_formatter" },
      ];

    case "task":
      return [
        { label: "Command Received", node_type: "command_intake", assigned: "Nettie", status: "completed", input: command, output: "Command recorded in Mission Control.", actor: "Nettie", tool_used: "command_console" },
        { label: "Nettie Classification", node_type: "intent_classification", assigned: "Nettie", status: "completed", input: command, output: `Intent: ${route.intent}. Routed to ${route.department}. Risk: ${route.risk_tier}.`, actor: "Nettie", tool_used: "deterministic_router" },
        { label: "Icky Intake", node_type: "department_routing", assigned: "Icky", status: "completed", input: command, output: "Icky received the admin task lane and prepared the follow-through record.", actor: "Icky", tool_used: "department_router" },
        { label: "Task Creation", node_type: "agent_or_skill_execution", assigned: "Icky / Clerk", status: "completed", input: command, output: taskOutput, actor: "Icky", tool_used: "task_registry" },
        { label: "Priority Assignment", node_type: "validation", assigned: "Icky / Anchor", status: "completed", input: command, output: "Priority set to high and time-sensitive follow-up noted for tomorrow.", actor: "Icky", tool_used: "priority_sorter" },
        { label: "Evidence Capture", node_type: "evidence_capture", assigned: "Mission Control", status: "completed", input: command, output: sharedApprovedNote, actor: "Mission Control", tool_used: "evidence_store" },
        { label: "Return Answer to Nettie", node_type: "response_return", assigned: "Nettie", status: "completed", input: command, output: taskOutput, actor: "Nettie", tool_used: "response_formatter" },
      ];

    case "opportunity":
      return [
        { label: "Command Received", node_type: "command_intake", assigned: "Nettie", status: "completed", input: command, output: "Command recorded in Mission Control.", actor: "Nettie", tool_used: "command_console" },
        { label: "Nettie Classification", node_type: "intent_classification", assigned: "Nettie", status: "completed", input: command, output: `Intent: ${route.intent}. Routed to ${route.department}. Risk: ${route.risk_tier}.`, actor: "Nettie", tool_used: "deterministic_router" },
        { label: "Funboy Intake", node_type: "department_routing", assigned: "Funboy", status: "completed", input: command, output: "Funboy received the opportunity scan lane and activated the signal queue.", actor: "Funboy", tool_used: "department_router" },
        { label: "Opportunity Scan", node_type: "agent_or_skill_execution", assigned: "Funboy / Scout", status: "completed", input: command, output: opportunityOutput, actor: "Funboy", tool_used: "signal_scanner" },
        { label: "Ranking / Rationale", node_type: "validation", assigned: "Funboy / Rank", status: "completed", input: command, output: "Ranked by fit for governed personal-assistant workflows, low integration friction, and visible ROI.", actor: "Funboy", tool_used: "ranker" },
        { label: "Evidence Capture", node_type: "evidence_capture", assigned: "Mission Control", status: "completed", input: command, output: sharedApprovedNote, actor: "Mission Control", tool_used: "evidence_store" },
        { label: "Return Answer to Nettie", node_type: "response_return", assigned: "Nettie", status: "completed", input: command, output: opportunityOutput, actor: "Nettie", tool_used: "response_formatter" },
      ];

    case "external_write":
      return [
        { label: "Command Received", node_type: "command_intake", assigned: "Nettie", status: "completed", input: command, output: "Command recorded in Mission Control.", actor: "Nettie", tool_used: "command_console" },
        { label: "Nettie Classification", node_type: "intent_classification", assigned: "Nettie", status: "completed", input: command, output: `Intent: ${route.intent}. Routed to ${route.department}. Risk: ${route.risk_tier}.`, actor: "Nettie", tool_used: "deterministic_router" },
        { label: "Perry Intake", node_type: "department_routing", assigned: "Perry", status: "completed", input: command, output: "Perry received the external-write governance lane.", actor: "Perry", tool_used: "department_router" },
        { label: "Risk Tier Classification", node_type: "agent_or_skill_execution", assigned: "Perry / Lock", status: "completed", input: command, output: `Risk tier classified as ${route.risk_tier}. Draft-only mode is required.`, actor: "Perry", tool_used: "risk_classifier" },
        { label: "Approval Rule Check", node_type: "approval_gate", assigned: "Perry / Vault", status: "awaiting_approval", input: command, output: riskOutput, actor: "Perry", tool_used: "approval_gate" },
        { label: "Draft / Hold", node_type: "agent_or_skill_execution", assigned: "Nettie / Draft Mode", status: "completed", input: command, output: "Draft saved locally. Nothing was sent or created externally.", actor: "Nettie", tool_used: "draft_buffer" },
        { label: "Evidence Capture", node_type: "evidence_capture", assigned: "Mission Control", status: "completed", input: command, output: sharedApprovedNote, actor: "Mission Control", tool_used: "evidence_store" },
        { label: "Return Answer to Nettie", node_type: "response_return", assigned: "Nettie", status: "completed", input: command, output: riskOutput, actor: "Nettie", tool_used: "response_formatter" },
      ];

    case "qa":
      return [
        { label: "Command Received", node_type: "command_intake", assigned: "Nettie", status: "completed", input: command, output: "Command recorded in Mission Control.", actor: "Nettie", tool_used: "command_console" },
        { label: "Nettie Classification", node_type: "intent_classification", assigned: "Nettie", status: "completed", input: command, output: `Intent: ${route.intent}. Routed to ${route.department}. Risk: ${route.risk_tier}.`, actor: "Nettie", tool_used: "deterministic_router" },
        { label: "Van Intake", node_type: "department_routing", assigned: "Van", status: "completed", input: command, output: "Van received the technical QA lane and loaded the workflow state.", actor: "Van", tool_used: "department_router" },
        { label: "Workflow Status Check", node_type: "agent_or_skill_execution", assigned: "Van / Warden", status: "completed", input: command, output: qaOutput, actor: "Van", tool_used: "workflow_inspector" },
        { label: "QA Summary", node_type: "validation", assigned: "Van / Prism", status: "completed", input: command, output: "No failed nodes were detected in the seeded Aurora POC workflows.", actor: "Van", tool_used: "qa_summary" },
        { label: "Evidence Capture", node_type: "evidence_capture", assigned: "Mission Control", status: "completed", input: command, output: sharedApprovedNote, actor: "Mission Control", tool_used: "evidence_store" },
        { label: "Return Answer to Nettie", node_type: "response_return", assigned: "Nettie", status: "completed", input: command, output: qaOutput, actor: "Nettie", tool_used: "response_formatter" },
      ];

    default:
      return [
        { label: "Command Received", node_type: "command_intake", assigned: "Nettie", status: "completed", input: command, output: "Command recorded in Mission Control.", actor: "Nettie", tool_used: "command_console" },
        { label: "Nettie Classification", node_type: "intent_classification", assigned: "Nettie", status: "completed", input: command, output: `Intent: ${route.intent}. Routed to ${route.department}. Risk: ${route.risk_tier}.`, actor: "Nettie", tool_used: "deterministic_router" },
        { label: "Command Router", node_type: "department_routing", assigned: "Nettie", status: "completed", input: command, output: "General assistant lane selected.", actor: "Nettie", tool_used: "router" },
        { label: "Model Gateway", node_type: "agent_or_skill_execution", assigned: "Nettie", status: "completed", input: command, output: "Demo-mode response produced without external model access.", actor: "Nettie", tool_used: "model_gateway" },
        { label: "Approval Gate", node_type: "approval_gate", assigned: "Perry", status: "completed", input: command, output: "No approval gate required for this request.", actor: "Perry", tool_used: "policy_gate" },
        { label: "Evidence Capture", node_type: "evidence_capture", assigned: "Mission Control", status: "completed", input: command, output: sharedApprovedNote, actor: "Mission Control", tool_used: "evidence_store" },
        { label: "Return Answer to Nettie", node_type: "response_return", assigned: "Nettie", status: "completed", input: command, output: "Nettie returned the general assistant summary in demo mode.", actor: "Nettie", tool_used: "response_formatter" },
      ];
  }
}

function finalSummary(route, command) {
  if (route.template === "finance") {
    return {
      status: "blocked",
      text: "Dana routed the command, but the finance lookup is demo-safe only. No live Microsoft share price was fabricated.",
    };
  }

  if (route.template === "external_write") {
    return {
      status: "awaiting_approval",
      text: "Perry routed the command into draft-only governance. Nothing was sent or created externally.",
    };
  }

  if (route.template === "content") {
    return {
      status: "completed",
      text: "Torina produced the investor-facing draft and recorded evidence.",
    };
  }

  if (route.template === "task") {
    return {
      status: "completed",
      text: "Icky created the task and preserved the visible follow-through record.",
    };
  }

  if (route.template === "opportunity") {
    return {
      status: "completed",
      text: "Funboy returned a concise opportunity scan with evidence attached.",
    };
  }

  if (route.template === "qa") {
    return {
      status: "completed",
      text: "Van inspected the workflow state and found no failed nodes in the seeded POC.",
    };
  }

  return {
    status: "completed",
    text: "Nettie routed the command and returned a demo-mode summary.",
  };
}

export function buildWorkflowBundle(command, { createdAt = isoNow(), jobId: providedJobId } = {}) {
  const route = routeFromCommand(command);
  const jobId = providedJobId || `aurora_${slugify(command).slice(0, 24) || createId("job")}`;
  const workflowId = `wf_${jobId}`;
  const modelRunId = `mr_${jobId}`;
  const steps = templateSteps(route, command);
  const nodes = steps.map((step, index) => buildStep({
    jobId,
    workflowId,
    modelRunId,
    index,
    label: step.label,
    node_type: step.node_type,
    assigned_agent_or_skill_node: step.assigned,
    status: step.status,
    input: step.input,
    output: step.output,
    actor: step.actor,
    tool_used: step.tool_used,
    model_used: route.actual_model,
    task_type: route.task_type,
    reason_selected: route.reason_selected,
    confidence: route.confidence,
    limitations: route.limitations,
    error: step.error || null,
  }));
  const workflow = {
    id: workflowId,
    department: route.department,
    job_id: jobId,
    workflow_name: `${route.department} POC Workflow`,
    status: finalSummary(route, command).status,
    created_at: createdAt,
    completed_at: createdAt,
  };
  const job = {
    id: jobId,
    created_at: createdAt,
    updated_at: createdAt,
    requester: "Patrick",
    original_command: command,
    normalized_command: command.toLowerCase().trim(),
    detected_intent: route.intent,
    assigned_department: route.department,
    assigned_agent_or_node: route.agent,
    status: finalSummary(route, command).status,
    priority: route.risk_tier === "Tier 2" ? "high" : route.risk_tier === "Tier 1" ? "medium" : "medium",
    risk_tier: route.risk_tier,
    approval_required: route.approval_required,
    output_summary: finalSummary(route, command).text,
    evidence: nodes.filter((node) => node.status !== "pending").map((node) => node.evidence_id),
    error: route.template === "finance" ? "demo_mode_only" : null,
    completed_at: createdAt,
    model_run_id: modelRunId,
    backend_job_id: null,
  };
  const modelRunStatus = route.actual_provider === route.intended_provider ? "completed" : "demo_mode";
  const modelRun = {
    id: modelRunId,
    job_id: jobId,
    node_id: nodes[3]?.id || nodes[0].id,
    provider: route.intended_provider,
    model: route.intended_model,
    actual_provider: route.actual_provider,
    actual_model: route.actual_model,
    task_type: route.task_type,
    reason_selected: route.reason_selected,
    confidence: route.confidence,
    limitations: route.limitations,
    status: modelRunStatus,
    output_log: finalSummary(route, command).text,
    created_at: createdAt,
    completed_at: createdAt,
  };
  const edges = nodes.slice(0, -1).map((node, index) => ({
    id: `${workflowId}-e${index + 1}`,
    workflow_id: workflowId,
    job_id: jobId,
    from_node_id: node.id,
    to_node_id: nodes[index + 1].id,
  }));
  const evidenceLogs = nodes.map((node) => buildEvidence(node, job, workflow, modelRunId));
  const agentMessages = [
    {
      id: `${jobId}-msg-1`,
      job_id: jobId,
      from_agent: "Nettie",
      to_agent: route.department,
      message_type: "work_request",
      content: `Route ${route.intent} to ${route.department}. Risk tier ${route.risk_tier}.`,
      status: "completed",
      created_at: createdAt,
      resolved_at: createdAt,
    },
    {
      id: `${jobId}-msg-2`,
      job_id: jobId,
      from_agent: route.department,
      to_agent: "Nettie",
      message_type: route.template === "finance" ? "blocked_notice" : route.template === "external_write" ? "review_response" : "execution_result",
      content: finalSummary(route, command).text,
      status: "completed",
      created_at: createdAt,
      resolved_at: createdAt,
    },
  ];

  return {
    route,
    job,
    workflow,
    nodes,
    edges,
    evidenceLogs,
    agentMessages,
    modelRuns: [modelRun],
    nettieReply: {
      from: "Nettie",
      to: "Patrick",
      status: finalSummary(route, command).status,
      text: finalSummary(route, command).text,
      department: route.department,
      risk_tier: route.risk_tier,
      approval_required: route.approval_required,
    },
  };
}

export function buildSeedState() {
  const bundles = DEMO_COMMANDS.map((command, index) => buildWorkflowBundle(command, {
    createdAt: isoNow(-index * 9 * 60 * 1000),
    jobId: `aurora_seed_${index + 1}`,
  }));
  const jobs = bundles.map((bundle) => bundle.job);
  const department_workflows = bundles.map((bundle) => bundle.workflow);
  const workflow_nodes = bundles.flatMap((bundle) => bundle.nodes);
  const workflow_edges = bundles.flatMap((bundle) => bundle.edges);
  const evidence_logs = bundles.flatMap((bundle) => bundle.evidenceLogs);
  const agent_messages = bundles.flatMap((bundle) => bundle.agentMessages);
  const model_runs = bundles.flatMap((bundle) => bundle.modelRuns);

  return {
    activeDepartment: "Dana",
    selectedJobId: jobs[0]?.id || null,
    selectedNodeId: bundles[0]?.nodes[3]?.id || bundles[0]?.nodes[0]?.id || null,
    jobs,
    department_workflows,
    workflow_nodes,
    workflow_edges,
    evidence_logs,
    agent_messages,
    model_runs,
    nettie_feed: bundles.map((bundle) => ({
      job_id: bundle.job.id,
      department: bundle.route.department,
      text: bundle.nettieReply.text,
      status: bundle.nettieReply.status,
      risk_tier: bundle.nettieReply.risk_tier,
      approval_required: bundle.nettieReply.approval_required,
      created_at: bundle.job.created_at,
    })),
  };
}

export function loadAuroraState() {
  if (typeof window === "undefined") {
    return buildSeedState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildSeedState();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return buildSeedState();
    return {
      ...buildSeedState(),
      ...parsed,
    };
  } catch {
    return buildSeedState();
  }
}

export function saveAuroraState(state) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function selectLatestJobForDepartment(state, department) {
  const jobs = Array.isArray(state?.jobs) ? state.jobs : [];
  if (department === "Nettie") {
    return jobs[0] || null;
  }
  return jobs.find((job) => job.assigned_department === department) || null;
}

export function sortJobsNewestFirst(jobs = []) {
  return [...jobs].sort((a, b) => String(b.created_at || b.updated_at || "").localeCompare(String(a.created_at || a.updated_at || "")));
}

export function getDepartmentJobCount(state, department) {
  if (department === "Nettie") return Array.isArray(state?.jobs) ? state.jobs.length : 0;
  return (Array.isArray(state?.jobs) ? state.jobs : []).filter((job) => job.assigned_department === department).length;
}

export function getWorkflowNodesForJob(state, jobId) {
  return (Array.isArray(state?.workflow_nodes) ? state.workflow_nodes : []).filter((node) => node.job_id === jobId).sort((a, b) => a.node_order - b.node_order);
}

export function getEvidenceForJob(state, jobId) {
  return (Array.isArray(state?.evidence_logs) ? state.evidence_logs : []).filter((entry) => entry.job_id === jobId).sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
}

export function getMessagesForJob(state, jobId) {
  return (Array.isArray(state?.agent_messages) ? state.agent_messages : []).filter((entry) => entry.job_id === jobId).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
}

export function mergeAuroraBundleIntoState(currentState, response) {
  if (response?.state && typeof response.state === 'object') {
    return response.state
  }

  const bundle = response?.bundle?.job ? response.bundle : response
  if (!bundle?.job) return currentState || buildSeedState()

  const base = currentState || buildSeedState()
  const jobId = bundle.job.id
  return {
    ...base,
    jobs: sortJobsNewestFirst([bundle.job, ...(base.jobs || []).filter((entry) => entry.id !== jobId)]),
    department_workflows: [bundle.workflow, ...(base.department_workflows || []).filter((entry) => entry.job_id !== jobId)],
    workflow_nodes: [...bundle.nodes, ...(base.workflow_nodes || []).filter((entry) => entry.job_id !== jobId)],
    workflow_edges: [...bundle.edges, ...(base.workflow_edges || []).filter((entry) => entry.job_id !== jobId)],
    evidence_logs: [...bundle.evidenceLogs, ...(base.evidence_logs || []).filter((entry) => entry.job_id !== jobId)],
    agent_messages: [...bundle.agentMessages, ...(base.agent_messages || []).filter((entry) => entry.job_id !== jobId)],
    model_runs: [...bundle.modelRuns, ...(base.model_runs || []).filter((entry) => entry.job_id !== jobId)],
    nettie_feed: [
      bundle.nettieReply,
      ...(base.nettie_feed || []).filter((entry) => entry.job_id !== jobId),
    ],
    activeDepartment: bundle.route?.department || base.activeDepartment || 'Dana',
    selectedJobId: jobId,
    selectedNodeId: bundle.nodes.find((node) => node.status === 'blocked')?.id
      || bundle.nodes.find((node) => node.status === 'awaiting_approval')?.id
      || bundle.nodes[bundle.nodes.length - 1]?.id
      || null,
  }
}


export function getModelRunsForJob(state, jobId) {
  return (Array.isArray(state?.model_runs) ? state.model_runs : []).filter((entry) => entry.job_id === jobId)
}

export function getEvidenceByNode(state, nodeId) {
  return (Array.isArray(state?.evidence_logs) ? state.evidence_logs : []).find((entry) => entry.node_id === nodeId) || null;
}

export function getWorkflowForJob(state, jobId) {
  return (Array.isArray(state?.department_workflows) ? state.department_workflows : []).find((workflow) => workflow.job_id === jobId) || null;
}

export function getWorkflowEdgesForJob(state, jobId) {
  return (Array.isArray(state?.workflow_edges) ? state.workflow_edges : []).filter((edge) => edge.job_id === jobId);
}

export function getCurrentJob(state, selectedJobId, activeDepartment) {
  if (selectedJobId) {
    const byId = (Array.isArray(state?.jobs) ? state.jobs : []).find((job) => job.id === selectedJobId);
    if (byId) return byId;
  }
  return selectLatestJobForDepartment(state, activeDepartment);
}

export function getCurrentNode(state, jobId, selectedNodeId) {
  const nodes = getWorkflowNodesForJob(state, jobId);
  if (selectedNodeId) {
    const selected = nodes.find((node) => node.id === selectedNodeId);
    if (selected) return selected;
  }
  return nodes.find((node) => node.status === "blocked") || nodes.find((node) => node.status === "awaiting_approval") || nodes[nodes.length - 1] || null;
}

export function getNettieReplyForJob(state, jobId) {
  return (Array.isArray(state?.nettie_feed) ? state.nettie_feed : []).find((entry) => entry.job_id === jobId) || null;
}

export { STORAGE_KEY, DEPARTMENTS, DEMO_COMMANDS, routeFromCommand };
