export type JobStatus = "queued" | "running" | "completed" | "failed";

export type ScanJob = {
  id: string;
  scannerType?: "dependency" | "config";
  sourceType: "github" | "zip" | "local";
  sourceLabel: string;
  status: JobStatus;
  error?: string | null;
  createdAt: string;
  updatedAt: string;
  result?: ScanResult | null;
};

export type LogEntry = {
  id: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
  timestamp: string;
  meta?: Record<string, unknown>;
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

export type ScanResult = DependencyScanResult & ConfigScanResult;

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
