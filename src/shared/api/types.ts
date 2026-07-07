export type JobStatus = "queued" | "running" | "completed" | "failed";

export type ScanJob = {
  id: string;
  scannerType?: "dependency" | "config" | "secret" | "cipher";
  sourceType: "github" | "zip" | "local";
  sourceLabel: string;
  status: JobStatus;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
  result?: ScanResult | null;
  logs?: LogEntry[];
};

export type DashboardStats = {
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  totalFindings: number;
  criticalFindings: number;
  scanCounts: {
    dependency: number;
    config: number;
    secret: number;
    cipher: number;
  };
  scannerDetails: {
    dependency: { scans: number; findings: number; critical: number; high: number; medium: number; low: number; };
    config: { scans: number; findings: number; critical: number; high: number; medium: number; low: number; };
    secret: { scans: number; findings: number; critical: number; high: number; medium: number; low: number; };
    cipher: { scans: number; findings: number; critical: number; high: number; medium: number; low: number; };
  };
  scheduled: {
    total: number;
    failed: number;
  };
  agents: {
    total: number;
    connected: number;
  };
  githubConnected: boolean;
  recentScans: Array<{
    id: string;
    sourceLabel: string;
    scannerType: string;
    status: string;
    createdAt: string;
  }>;
  riskiestAssets: Array<{
    sourceLabel: string;
    criticalCount: number;
    highCount: number;
  }>;
  trendData: Array<{
    date: string;
    findingsCount: number;
  }>;
};

export type BusinessRiskContext = {
  assetCriticality: number;
  dataSensitivity: number;
  businessImpact: number;
  internetExposure: number;
  complianceRequirement: number;
  exploitWindow: number;
};

export type RiskBusinessInput = {
  key: string;
  label: string;
  default: number;
  value: number;
  meaning: string;
  low_hint: string;
  high_hint: string;
};

export type UnifiedRiskFinding = {
  id: string;
  scanner: "dependency" | "config" | "secret" | "cipher" | "unknown";
  source_job_id?: string | null;
  source_label?: string | null;
  title: string;
  severity: string;
  category: string;
  file_path?: string | null;
  line_number?: number | null;
  technical_score: number;
  business_adjusted_score: number;
  risk_level: "low" | "moderate" | "elevated" | "high" | "critical";
  plain_language_summary: string;
  remediation?: string | null;
};

export type UnifiedScannerRisk = {
  scanner: "dependency" | "config" | "secret" | "cipher" | "unknown";
  source_job_id?: string | null;
  technical_score: number;
  business_adjusted_score: number;
  risk_level: "low" | "moderate" | "elevated" | "high" | "critical";
  finding_count: number;
  critical_findings: number;
  high_findings: number;
  reasons: string[];
};

export type UnifiedRiskPriority = {
  rank: number;
  scanner: "dependency" | "config" | "secret" | "cipher" | "unknown";
  title: string;
  severity: string;
  category: string;
  score: number;
  risk_level: "low" | "moderate" | "elevated" | "high" | "critical";
  source_job_id?: string | null;
  file_path?: string | null;
  line_number?: number | null;
  why_first: string;
  fix_first: string;
  next_step: string;
  suggested_owner: string;
  sla: string;
};

export type ExecutiveRiskBrief = {
  headline: string;
  business_impact: string;
  decision: string;
  board_message: string;
  top_actions: string[];
};

export type UnifiedRiskResponse = {
  project_name: string;
  environment: string;
  technical_risk_score: number;
  business_risk_score: number;
  final_risk_score: number;
  risk_level: "low" | "moderate" | "elevated" | "high" | "critical";
  formula: {
    technical_weight: number;
    business_weight: number;
    technical_risk_score: number;
    business_risk_score: number;
    final_risk_score: number;
    expression: string;
  };
  business_inputs: RiskBusinessInput[];
  scanner_scores: Record<string, UnifiedScannerRisk>;
  top_findings: UnifiedRiskFinding[];
  correlation_paths: Array<{
    id: string;
    title: string;
    score: number;
    risk_level: string;
    scanners: string[];
    story: string;
    evidence: string[];
    remediation: string[];
  }>;
  executive_summary: string;
  developer_summary: string;
  remediation_priorities: string[];
  overall_priorities?: UnifiedRiskPriority[];
  scanner_priorities?: Record<string, UnifiedRiskPriority[]>;
  executive_brief?: ExecutiveRiskBrief | null;
  ai_recommendation?: string | null;
  ai_recommendations?: Array<{
    finding_id: string;
    source_job_id?: string | null;
    scanner: "dependency" | "config" | "secret" | "cipher" | "unknown";
    title: string;
    model?: string | null;
    prompt_policy: string;
    recommendation: string;
    fallback_used: boolean;
    token_usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  }>;
};

export type RiskOverview = {
  status: "ok" | "empty";
  message?: string;
  groups: Array<{
    sourceLabel: string;
    sourceType: string;
    latestCreatedAt: string;
    jobIds?: string[];
    scanners: Array<"dependency" | "config" | "secret" | "cipher">;
  }>;
  selectedSourceLabel?: string | null;
  selectedSourceType?: string;
  missingScanners?: string[];
  selectedJobIds?: string[];
  scannerJobs?: Record<string, ScanJob>;
  risk: UnifiedRiskResponse | null;
};

export type RiskAssessment = {
  id: string;
  userId?: string;
  sourceType: "github" | "zip" | "local" | "vm-agent" | string;
  sourceLabel: string;
  status: "waiting" | "running" | "completed" | "failed" | "cancelled" | string;
  scanJobIds: string[];
  agentScanJobIds: string[];
  businessContext?: BusinessRiskContext | null;
  weights?: { technical?: number; business?: number } | null;
  result?: {
    risk?: UnifiedRiskResponse;
    input?: {
      scannerJobs?: Array<{
        job_id: string;
        scanner: "dependency" | "config" | "secret" | "cipher" | "unknown";
        source_label?: string | null;
        source_type?: string | null;
        completed_at?: string | null;
      }>;
      skipped?: Array<{ job_id: string; type: string; reason: string }>;
    };
    [key: string]: unknown;
    aiRemedies?: UnifiedRiskResponse["ai_recommendations"];
    aiTokenUsage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
    aiPromptPolicy?: string;
    aiGeneratedAt?: string;
  } | null;
  error?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type LogEntry = {
  id: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
  timestamp: string;
  meta?: Record<string, unknown>;
};

export type AgentPath = {
  path: string;
  label: string;
  type: string;
  recommended?: boolean;
  risk?: "low" | "medium" | "high" | string;
};

export type AgentInventory = {
  paths: AgentPath[];
  services: Array<{ name: string; status: string; ports?: number[] }>;
  ports: number[];
  updatedAt?: string;
};

export type VmAgent = {
  id: string;
  name: string;
  hostname: string;
  os?: string | null;
  version?: string | null;
  status: "online" | "offline" | "scanning" | "error";
  lastSeenAt?: string | null;
  inventory?: AgentInventory | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AgentScanJob = {
  id: string;
  userId?: string;
  agentId: string;
  sourceLabel: string;
  scope: "full-os" | "root" | "selected" | "application";
  selectedPaths: string[];
  modules: Array<"dependency" | "config" | "secret" | "cipher">;
  status: "queued" | "running" | "stopping" | "stopped" | "completed" | "failed";
  command?: Record<string, unknown> | null;
  result?: {
    source?: string;
    summary?: {
      status?: string;
      total_findings?: number;
      risk_score?: number;
      [key: string]: unknown;
    };
    reports?: Array<{ module: string; status: string; findings: number; risk_score: number }>;
    [key: string]: unknown;
  } | null;
  error?: string | null;
  logs?: LogEntry[];
  createdAt: string;
  updatedAt?: string;
  startedAt?: string | null;
  completedAt?: string | null;
};

export type DependencyScanResult = {
  summary: {
    total_manifests: number;
    total_dependencies: number;
    vulnerable_dependencies: number;
    dependency_risk_findings?: number;
    risk_chains?: number;
    capability_findings?: number;
    namespace_risks?: number;
    banking_exposure_score?: number;
    banking_action?: "block" | "expedite" | "watch" | "track";
    risk_score: number;
    ci_status: "passed" | "failed";
    findings_by_severity: Record<string, number>;
  };
  findings: Array<{
    id: string;
    package_name: string;
    installed_version?: string;
    ecosystem: string;
    severity: string;
    summary: string;
    fix: {
      title: string;
      description: string;
      command?: string;
      auto_remediable: boolean;
    };
  }>;
  dependency_risks?: Array<{
    id: string;
    dependency_name?: string | null;
    manifest_path: string;
    severity: string;
    category: string;
    title: string;
    description: string;
    fix: {
      title: string;
      description: string;
      command?: string;
      auto_remediable: boolean;
    };
  }>;
  capability_findings?: Array<{
    id: string;
    capability: string;
    severity: string;
    title: string;
    description: string;
    file_path: string;
    line_number?: number | null;
    code?: string | null;
    dependency_name?: string | null;
    banking_impact: string;
    fix: {
      title: string;
      description: string;
      command?: string;
      auto_remediable: boolean;
    };
  }>;
  namespace_risks?: Array<{
    id: string;
    severity: string;
    category: string;
    title: string;
    description: string;
    file_path: string;
    dependency_name?: string | null;
    evidence: string[];
    banking_impact: string;
    fix: {
      title: string;
      description: string;
      command?: string;
      auto_remediable: boolean;
    };
  }>;
  risk_chains?: Array<{
    id: string;
    dependency_name: string;
    ecosystem: string;
    severity: string;
    title: string;
    risk_chain: string[];
    trace?: Array<{
      step: number;
      kind: "route" | "manifest" | "import" | "sensitive-use" | "risk" | "fix";
      label: string;
      file_path?: string | null;
      line_number?: number | null;
      code?: string | null;
      details: string[];
    }>;
    manifest_path?: string | null;
    sensitive_contexts: string[];
    used_in_files: string[];
    evidence: string[];
    exposure?: ExposureScore | null;
    fix: {
      title: string;
      description: string;
      command?: string;
      auto_remediable: boolean;
    };
  }>;
};

export type ConfigScanResult = {
  summary: {
    total_files_seen?: number;
    supported_files_scanned?: number;
    total_findings?: number;
    findings_by_severity?: Record<string, number>;
    findings_by_category?: Record<string, number>;
    risk_score?: number;
    attack_paths?: number;
    attack_path_score?: number;
    environment_drifts?: number;
    ci_status?: "passed" | "failed";
    fail_on?: string;
  };
  findings?: Array<{
    rule_id: string;
    title: string;
    severity: string;
    category: string;
    file_path: string;
    line_number: number;
    description: string;
    remediation: {
      title: string;
      description: string;
      example?: string | null;
      auto_remediable: boolean;
    };
    confidence: number;
    evidence: string;
    cwe?: string;
    references?: string[];
  }>;
  attack_paths?: Array<{
    id: string;
    title: string;
    severity: string;
    score: number;
    confidence: number;
    attack_story: string;
    steps: Array<{
      step: number;
      stage: string;
      title: string;
      file_path: string;
      line_number: number;
      evidence: string;
      details: string[];
    }>;
  }>;
};

export type SecretScanResult = {
  summary: {
    total_files_seen?: number;
    files_scanned?: number;
    skipped_files?: number;
    total_findings?: number;
    unique_secrets?: number;
    findings_by_severity?: Record<string, number>;
    findings_by_category?: Record<string, number>;
    findings_by_secret_type?: Record<string, number>;
    exposure_paths?: number;
    rotation_playbooks?: number;
    sensitive_data_findings?: number;
    historical_exposures?: number;
    compromised_matches?: number;
    usage_paths?: number;
    risk_score?: number;
    ci_status?: "passed" | "failed";
    fail_on?: string;
  };
  risk?: {
    risk_score: number;
    action: "block" | "rotate" | "review" | "track";
    exposed_secret_types: string[];
    high_confidence_findings: number;
    rotation_required: boolean;
    reasons: string[];
  };
  findings?: Array<{
    id: string;
    rule_id: string;
    title: string;
    severity: string;
    category: string;
    secret_type: string;
    file_path: string;
    line_number?: number | null;
    column_start?: number | null;
    confidence: number;
    entropy?: number | null;
    fingerprint: string;
    evidence: string;
    context?: string | null;
    validation_status: string;
    remediation: {
      title: string;
      description: string;
      rotation_required: boolean;
      auto_remediable: boolean;
    };
    cwe?: string | null;
  }>;
  files?: Array<{
    path: string;
    type: string;
    scanned: boolean;
    finding_count: number;
    skipped_reason?: string | null;
  }>;
  exposure_paths?: Array<{
    id: string;
    title: string;
    severity: string;
    score: number;
    confidence: number;
    secret_fingerprint: string;
    secret_type: string;
    provider_family: string;
    file_path: string;
    line_number?: number | null;
    entry_point: string;
    exposed_asset: string;
    probable_capabilities: string[];
    abuse_sequence: string[];
    blast_radius: string[];
    containment_priority: string;
    rotation_steps: string[];
    validation_checks: string[];
  }>;
  rotation_playbooks?: Array<{
    id: string;
    secret_fingerprint: string;
    secret_type: string;
    priority: string;
    owner_hint: string;
    steps: string[];
    verification: string[];
  }>;
  secret_graph?: {
    nodes: Array<{ id: string; label: string; kind: string; severity?: string | null }>;
    edges: Array<{ source: string; target: string; label: string }>;
  };
  policy_decision?: {
    status: "passed" | "failed";
    gate: string;
    reasons: string[];
    required_actions: string[];
  } | null;
  sensitive_data_findings?: Array<{
    id: string;
    data_type: string;
    severity: string;
    file_path: string;
    line_number?: number | null;
    confidence: number;
    fingerprint: string;
    evidence: string;
    compliance: string[];
    remediation: string;
  }>;
  historical_exposures?: Array<{
    id: string;
    commit: string;
    date?: string | null;
    author?: string | null;
    file_path?: string | null;
    rule_id: string;
    secret_type: string;
    severity: string;
    fingerprint: string;
    evidence: string;
    remediation: string;
  }>;
  compromised_matches?: Array<{
    id: string;
    secret_fingerprint: string;
    match_source: string;
    severity: string;
    action: string;
  }>;
  usage_paths?: Array<{
    id: string;
    secret_fingerprint: string;
    variable_hint: string;
    source_file: string;
    usage_file: string;
    line_number?: number | null;
    sink_type: string;
    evidence: string;
    impact: string;
  }>;
};

export type CipherScanResult = {
  summary: {
    total_files_seen?: number;
    supported_files_scanned?: number;
    total_findings?: number;
    findings_by_severity?: Record<string, number>;
    findings_by_category?: Record<string, number>;
    tls_facts?: number;
    endpoint_policies?: number;
    discovered_domains?: number;
    api_endpoints?: number;
    live_tls_probes?: number;
    deployed_domains?: number;
    static_live_drifts?: number;
    attack_paths?: number;
    environment_drifts?: number;
    agility_risks?: number;
    compatibility_risks?: number;
    mtls_readiness_gaps?: number;
    remediation_actions?: number;
    risk_score?: number;
    ci_status?: "passed" | "failed";
    fail_on?: string;
    banking_profile?: string;
  };
  findings?: Array<{
    id: string;
    rule_id: string;
    title: string;
    severity: string;
    category: string;
    file_path: string;
    line_number?: number | null;
    evidence: string;
    description: string;
    remediation: {
      title: string;
      description: string;
      secure_example?: string | null;
      auto_remediable: boolean;
    };
    confidence: number;
    affected_protocols?: string[];
    affected_ciphers?: string[];
    compliance?: string[];
  }>;
  files?: Array<{
    path: string;
    type: string;
    finding_count: number;
    scanned: boolean;
  }>;
  tls_facts?: Array<{
    id: string;
    file_path: string;
    line_number: number;
    key: string;
    value: string;
    fact_type: string;
    environment: string;
    endpoint_hint?: string | null;
    parser: string;
    confidence: number;
  }>;
  endpoint_policies?: Array<{
    id: string;
    endpoint: string;
    file_path: string;
    protocols: string[];
    ciphers: string[];
    tls13_enabled: boolean;
    forward_secrecy: boolean;
    weak_items: string[];
    grade: "A" | "B" | "C" | "D" | "F";
    reasons: string[];
  }>;
  domain_inventory?: Array<{
    id: string;
    base_domain: string;
    host: string;
    scheme?: string | null;
    port?: number | null;
    path?: string | null;
    endpoint_type: string;
    source_file: string;
    line_number?: number | null;
    environment: string;
    evidence?: string | null;
    tls_policy_refs?: string[];
    risk_notes?: string[];
    confidence: number;
  }>;
  live_tls_probes?: Array<{
    id: string;
    host: string;
    port: number;
    source_endpoint_id?: string | null;
    deployment_status: "deployed" | "not-deployed" | "tls-error" | "skipped";
    tls_reachable: boolean;
    negotiated_protocol?: string | null;
    negotiated_cipher?: string | null;
    cipher_bits?: number | null;
    accepted_legacy_protocols?: string[];
    certificate_subject?: string | null;
    certificate_issuer?: string | null;
    certificate_not_before?: string | null;
    certificate_not_after?: string | null;
    certificate_days_remaining?: number | null;
    renewal_window_status: "healthy" | "renew-soon" | "urgent" | "expired" | "unknown";
    static_policy_match: "matches-static" | "drift" | "no-static-policy" | "unknown";
    attacker_window?: string | null;
    risk_notes?: string[];
    error?: string | null;
    checked_at?: string | null;
  }>;
  attack_paths?: Array<{
    id: string;
    title: string;
    severity: string;
    score: number;
    confidence: number;
    entry_point: string;
    weakness_chain: string[];
    banking_impact: string[];
    remediation: {
      title: string;
      description: string;
      secure_example?: string | null;
      auto_remediable: boolean;
    };
  }>;
  policy_graph?: {
    nodes: Array<{
      id: string;
      label: string;
      kind: "file" | "endpoint" | "protocol" | "cipher" | "control" | "environment" | "finding";
      severity?: string | null;
      metadata?: Record<string, string | number | boolean | null>;
    }>;
    edges: Array<{
      source: string;
      target: string;
      relation: string;
      risk_weight: number;
    }>;
    hotspots: string[];
  } | null;
  environment_drifts?: Array<{
    id: string;
    title: string;
    severity: string;
    environments: string[];
    files: string[];
    drift_type: string;
    description: string;
    remediation: string;
  }>;
  agility_risks?: Array<{
    id: string;
    title: string;
    severity: string;
    affected_file: string;
    affected_items: string[];
    deprecation_reason: string;
    migration_target: string;
    banking_deadline_hint: string;
  }>;
  compatibility_risks?: Array<{
    id: string;
    endpoint: string;
    severity: string;
    profile: string;
    issue: string;
    supported_clients: string[];
    blocked_clients: string[];
    recommendation: string;
  }>;
  mtls_readiness?: Array<{
    id: string;
    endpoint: string;
    file_path: string;
    status: "ready" | "partial" | "missing" | "disabled";
    severity: string;
    evidence: string[];
    missing_controls: string[];
    recommendation: string;
  }>;
  deployment_readiness?: {
    status: "ready" | "needs-review" | "blocked";
    score: number;
    blockers: string[];
    warnings: string[];
    strengths: string[];
  } | null;
  remediation_plan?: Array<{
    id: string;
    title: string;
    priority: number;
    affected_findings: string[];
    config_family: string;
    patch_strategy: string;
    secure_baseline: string;
    rollback: string;
    auto_remediable: boolean;
  }>;
  policy_decision?: {
    status: "passed" | "failed";
    profile: string;
    fail_on: string;
    reasons: string[];
    required_actions: string[];
  } | null;
  compliance_mapping?: Array<{
    standard: string;
    control: string;
    status: string;
    finding_ids: string[];
  }>;
};

export type ScanResult = DependencyScanResult & ConfigScanResult & SecretScanResult & CipherScanResult;

export type ExposureScore = {
  score: number;
  action: "block" | "expedite" | "watch" | "track";
  exploit_likelihood: number;
  static_exploitability: number;
  business_criticality: number;
  trust_deficit: number;
  malicious_capability: number;
  blast_radius: number;
  reasons: string[];
};

export type RiskChain = NonNullable<DependencyScanResult["risk_chains"]>[number];

export type GithubUser = {
  login: string;
  name?: string | null;
  avatarUrl?: string;
  profileUrl?: string;
};

export type GithubRepository = {
  id: number;
  importedRepositoryId?: string;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  updatedAt: string;
  cloneUrl: string;
  htmlUrl: string;
  language?: string | null;
  description?: string | null;
};

export type ScannerModule = "dependency" | "config" | "secret" | "cipher";

export type ScheduledScan = {
  id: string;
  userId?: string;
  importedRepositoryId?: string | null;
  agentId?: string | null;
  selectedPaths?: string[];
  scope?: "full-os" | "root" | "selected" | "application" | string;
  name: string;
  sourceType: "github" | "vm-agent" | string;
  sourceLabel: string;
  scanners: ScannerModule[];
  frequency: "daily" | "weekly" | "monthly" | string;
  timeOfDay: string;
  timesPerDay: number;
  weekdays: number[];
  monthDays: number[];
  timezone: string;
  businessContext?: BusinessRiskContext | null;
  reportEmail?: string | null;
  enabled: boolean;
  running: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  lastStatus?: string | null;
  lastRiskAssessmentId?: string | null;
  lastScanJobIds?: string[];
  lastError?: string | null;
  createdAt: string;
  updatedAt?: string;
};
