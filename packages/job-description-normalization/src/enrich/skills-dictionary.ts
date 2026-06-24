// Seed skill dictionary. Deterministic, dictionary-driven skill
// extraction matches these aliases against posting text. This is intentionally a
// curated seed — taxonomy expansion (and an LLM-assisted pass) is later/optional.
// Curation rules to keep precision high:
// - aliases are matched as whole tokens, case-insensitively;
// - avoid bare single/common-word aliases that collide with English prose
//   (e.g. use "golang" for Go, not "go"); aliases with punctuation like "c++",
//   "c#", "node.js" are matched with token-boundary lookarounds, not `\b`.
/** Broad family a skill belongs to. Optional metadata. */
export type SkillCategory =
  | "language"
  | "frontend"
  | "framework"
  | "runtime"
  | "database"
  | "cloud"
  | "devops"
  | "messaging"
  | "api"
  | "testing"
  | "observability"
  | "architecture"
  | "security"
  | "data"
  | "ml"
  | "mobile"
  | "methodology"
  | "tool";

/** How one skill relates to another, strongest → weakest transfer. */
export type SkillRelationship =
  | "same_ecosystem"
  | "adjacent"
  | "commonly_used_with"
  | "weaker_transfer";

/** An adjacency edge from one skill to another, by `normalizedName`. */
export interface RelatedSkill {
  /** The related skill's `normalizedName`. */
  skillId: string;
  relationship: SkillRelationship;
  /** Transfer weight in (0,1] — how much credit the edge carries. */
  weight: number;
}

export interface SkillEntry {
  // Display name.
  name: string;
  // Canonical key (lowercase) — also the `skills.normalized_name`.
  normalizedName: string;
  // Alternate spellings matched against text (includes the canonical name).
  aliases: string[];
  // ---- Structured taxonomy, all optional ---------------------------
  // The deterministic rubric reads these for adjacent-skill credit and context
  // matching. Populated for the common software-engineering seed (see
  // `taxonomy/skill-graph.ts`); the long tail carries name/aliases only. Kept as
  // a *separate* metadata map rather than inlined here so the dictionary's
  // normalized-name set — and thus the fit-cache config hash — stays stable.
  /** Broad family (language, framework, database, …). */
  category?: SkillCategory;
  /** Work contexts this skill implies (backend, apis, distributed_systems, …). */
  contexts?: string[];
  /** Adjacency edges to other skills for partial/adjacent credit. */
  related?: RelatedSkill[];
  /** Verbs whose presence near this skill strengthens its evidence. */
  evidenceBoosts?: string[];
}

export const SKILL_DICTIONARY: SkillEntry[] = [
  // Languages
  { name: "JavaScript", normalizedName: "javascript", aliases: ["javascript", "js", "ecmascript"] },
  { name: "TypeScript", normalizedName: "typescript", aliases: ["typescript", "ts"] },
  { name: "Python", normalizedName: "python", aliases: ["python"] },
  { name: "Go", normalizedName: "go", aliases: ["golang"] },
  { name: "Rust", normalizedName: "rust", aliases: ["rust"] },
  { name: "Java", normalizedName: "java", aliases: ["java"] },
  { name: "Kotlin", normalizedName: "kotlin", aliases: ["kotlin"] },
  { name: "Elixir", normalizedName: "elixir", aliases: ["elixir"] },
  { name: "C++", normalizedName: "cpp", aliases: ["c++", "cpp"] },
  { name: "C#", normalizedName: "csharp", aliases: ["c#", "csharp", ".net", "dotnet"] },
  { name: "Ruby", normalizedName: "ruby", aliases: ["ruby"] },
  { name: "PHP", normalizedName: "php", aliases: ["php"] },
  { name: "Swift", normalizedName: "swift", aliases: ["swift"] },
  { name: "Scala", normalizedName: "scala", aliases: ["scala"] },
  { name: "SQL", normalizedName: "sql", aliases: ["sql"] },
  // Frontend
  { name: "React", normalizedName: "react", aliases: ["react", "react.js", "reactjs"] },
  { name: "Vue", normalizedName: "vue", aliases: ["vue", "vue.js", "vuejs"] },
  { name: "Angular", normalizedName: "angular", aliases: ["angular", "angularjs"] },
  { name: "Svelte", normalizedName: "svelte", aliases: ["svelte"] },
  { name: "Next.js", normalizedName: "nextjs", aliases: ["next.js", "nextjs"] },
  { name: "React Native", normalizedName: "react-native", aliases: ["react native", "react-native"] },
  { name: "HTML", normalizedName: "html", aliases: ["html", "html5"] },
  { name: "CSS", normalizedName: "css", aliases: ["css", "css3", "sass", "scss"] },
  { name: "Tailwind CSS", normalizedName: "tailwind", aliases: ["tailwind", "tailwindcss"] },
  // Backend / runtimes / frameworks
  { name: "Node.js", normalizedName: "nodejs", aliases: ["node.js", "nodejs", "node js"] },
  { name: "Django", normalizedName: "django", aliases: ["django"] },
  { name: "Flask", normalizedName: "flask", aliases: ["flask"] },
  { name: "FastAPI", normalizedName: "fastapi", aliases: ["fastapi"] },
  { name: "Spring", normalizedName: "spring", aliases: ["spring", "spring boot"] },
  // "express" alone collides with English prose, so match only the qualified forms.
  { name: "Express", normalizedName: "express", aliases: ["express.js", "expressjs"] },
  { name: "Rails", normalizedName: "rails", aliases: ["rails", "ruby on rails"] },
  { name: "GraphQL", normalizedName: "graphql", aliases: ["graphql"] },
  { name: "gRPC", normalizedName: "grpc", aliases: ["grpc"] },
  { name: "REST", normalizedName: "rest", aliases: ["rest", "restful", "rest api"] },
  // Data stores
  { name: "PostgreSQL", normalizedName: "postgresql", aliases: ["postgresql", "postgres", "psql"] },
  { name: "MySQL", normalizedName: "mysql", aliases: ["mysql"] },
  { name: "MongoDB", normalizedName: "mongodb", aliases: ["mongodb", "mongo"] },
  { name: "Redis", normalizedName: "redis", aliases: ["redis"] },
  { name: "Elasticsearch", normalizedName: "elasticsearch", aliases: ["elasticsearch", "opensearch"] },
  { name: "Kafka", normalizedName: "kafka", aliases: ["kafka"] },
  // Cloud / infra
  { name: "AWS", normalizedName: "aws", aliases: ["aws", "amazon web services"] },
  { name: "Google Cloud", normalizedName: "gcp", aliases: ["gcp", "google cloud", "google cloud platform"] },
  { name: "Azure", normalizedName: "azure", aliases: ["azure"] },
  { name: "Docker", normalizedName: "docker", aliases: ["docker"] },
  { name: "Kubernetes", normalizedName: "kubernetes", aliases: ["kubernetes", "k8s"] },
  { name: "Terraform", normalizedName: "terraform", aliases: ["terraform"] },
  { name: "CI/CD", normalizedName: "cicd", aliases: ["ci/cd", "cicd", "continuous integration"] },
  { name: "Jenkins", normalizedName: "jenkins", aliases: ["jenkins"] },
  { name: "Git", normalizedName: "git", aliases: ["git"] },
  { name: "Linux", normalizedName: "linux", aliases: ["linux"] },
  { name: "Bash", normalizedName: "bash", aliases: ["bash"] },
  // Data / ML / AI
  { name: "Machine Learning", normalizedName: "machine-learning", aliases: ["machine learning", "ml"] },
  // AI as a standalone competency; "ai" is matched as a whole token only, so it
  // doesn't fire inside words (e.g. "email", "Shanghai").
  { name: "AI", normalizedName: "ai", aliases: ["ai", "a.i.", "artificial intelligence"] },
  // LLM / generative-AI work (the rubric increasingly cares about this).
  {
    name: "LLM / GenAI",
    normalizedName: "llm",
    aliases: ["llm", "llms", "large language model", "large language models", "generative ai", "genai", "gen ai"],
  },
  { name: "TensorFlow", normalizedName: "tensorflow", aliases: ["tensorflow"] },
  { name: "PyTorch", normalizedName: "pytorch", aliases: ["pytorch"] },
  { name: "Pandas", normalizedName: "pandas", aliases: ["pandas"] },
  { name: "Spark", normalizedName: "spark", aliases: ["spark", "apache spark", "pyspark"] },
  { name: "Airflow", normalizedName: "airflow", aliases: ["airflow", "apache airflow"] },
  { name: "dbt", normalizedName: "dbt", aliases: ["dbt"] },
  { name: "Snowflake", normalizedName: "snowflake", aliases: ["snowflake"] },
  { name: "Databricks", normalizedName: "databricks", aliases: ["databricks"] },
  { name: "BigQuery", normalizedName: "bigquery", aliases: ["bigquery", "big query"] },

  // --- Expanded taxonomy -------------------------------------------------
  // Same precision discipline: every alias below is a distinctive, whole-token
  // technology term. Bare words that collide with English prose (e.g. "chef",
  // "gin", "echo", "vault", "lambda") are either omitted or qualified
  // ("aws lambda", "hashicorp vault").

  // More languages
  { name: "Objective-C", normalizedName: "objective-c", aliases: ["objective-c", "objective c", "objc"] },
  { name: "Perl", normalizedName: "perl", aliases: ["perl"] },
  { name: "Lua", normalizedName: "lua", aliases: ["lua"] },
  { name: "R", normalizedName: "r-lang", aliases: ["r programming", "r language", "rlang"] },
  { name: "Dart", normalizedName: "dart", aliases: ["dart"] },
  { name: "Haskell", normalizedName: "haskell", aliases: ["haskell"] },
  { name: "Clojure", normalizedName: "clojure", aliases: ["clojure", "clojurescript"] },
  { name: "Erlang", normalizedName: "erlang", aliases: ["erlang"] },
  { name: "Groovy", normalizedName: "groovy", aliases: ["groovy"] },
  { name: "Solidity", normalizedName: "solidity", aliases: ["solidity"] },
  { name: "MATLAB", normalizedName: "matlab", aliases: ["matlab"] },
  { name: "PowerShell", normalizedName: "powershell", aliases: ["powershell"] },
  { name: "F#", normalizedName: "fsharp", aliases: ["f#", "fsharp"] },
  { name: "COBOL", normalizedName: "cobol", aliases: ["cobol"] },
  { name: "VBA", normalizedName: "vba", aliases: ["vba"] },
  { name: "ABAP", normalizedName: "abap", aliases: ["abap"] },

  // More frontend
  { name: "Redux", normalizedName: "redux", aliases: ["redux"] },
  { name: "Nuxt", normalizedName: "nuxt", aliases: ["nuxt", "nuxt.js", "nuxtjs"] },
  { name: "Remix", normalizedName: "remix", aliases: ["remix.js", "remix run"] },
  { name: "Gatsby", normalizedName: "gatsby", aliases: ["gatsby", "gatsby.js"] },
  { name: "jQuery", normalizedName: "jquery", aliases: ["jquery"] },
  { name: "Webpack", normalizedName: "webpack", aliases: ["webpack"] },
  { name: "Vite", normalizedName: "vite", aliases: ["vite"] },
  { name: "Storybook", normalizedName: "storybook", aliases: ["storybook"] },
  { name: "Bootstrap", normalizedName: "bootstrap", aliases: ["bootstrap"] },
  { name: "Material UI", normalizedName: "material-ui", aliases: ["material ui", "material-ui", "mui"] },
  { name: "Ember", normalizedName: "ember", aliases: ["ember.js", "emberjs"] },
  { name: "Three.js", normalizedName: "threejs", aliases: ["three.js", "threejs"] },
  { name: "D3.js", normalizedName: "d3", aliases: ["d3.js", "d3js"] },
  { name: "WebGL", normalizedName: "webgl", aliases: ["webgl"] },
  { name: "Progressive Web Apps", normalizedName: "pwa", aliases: ["progressive web app", "pwa"] },

  // More backend frameworks
  { name: "NestJS", normalizedName: "nestjs", aliases: ["nestjs", "nest.js"] },
  { name: "Laravel", normalizedName: "laravel", aliases: ["laravel"] },
  { name: "Symfony", normalizedName: "symfony", aliases: ["symfony"] },
  { name: "ASP.NET", normalizedName: "aspnet", aliases: ["asp.net", "aspnet", "asp.net core", ".net core"] },
  { name: "Quarkus", normalizedName: "quarkus", aliases: ["quarkus"] },
  { name: "Micronaut", normalizedName: "micronaut", aliases: ["micronaut"] },
  { name: "Ktor", normalizedName: "ktor", aliases: ["ktor"] },
  { name: "Hibernate", normalizedName: "hibernate", aliases: ["hibernate"] },
  { name: "tRPC", normalizedName: "trpc", aliases: ["trpc"] },
  { name: "Socket.IO", normalizedName: "socketio", aliases: ["socket.io", "socketio"] },

  // Mobile
  { name: "Flutter", normalizedName: "flutter", aliases: ["flutter"] },
  { name: "SwiftUI", normalizedName: "swiftui", aliases: ["swiftui"] },
  { name: "Jetpack Compose", normalizedName: "jetpack-compose", aliases: ["jetpack compose"] },
  { name: "Xamarin", normalizedName: "xamarin", aliases: ["xamarin"] },
  { name: "Ionic", normalizedName: "ionic", aliases: ["ionic"] },

  // More data stores
  { name: "SQLite", normalizedName: "sqlite", aliases: ["sqlite"] },
  { name: "MariaDB", normalizedName: "mariadb", aliases: ["mariadb"] },
  { name: "Cassandra", normalizedName: "cassandra", aliases: ["cassandra"] },
  { name: "DynamoDB", normalizedName: "dynamodb", aliases: ["dynamodb"] },
  { name: "Couchbase", normalizedName: "couchbase", aliases: ["couchbase"] },
  { name: "CouchDB", normalizedName: "couchdb", aliases: ["couchdb"] },
  { name: "Neo4j", normalizedName: "neo4j", aliases: ["neo4j"] },
  { name: "InfluxDB", normalizedName: "influxdb", aliases: ["influxdb"] },
  { name: "Memcached", normalizedName: "memcached", aliases: ["memcached"] },
  { name: "Oracle DB", normalizedName: "oracle-db", aliases: ["oracle database", "oracle db", "pl/sql"] },
  { name: "SQL Server", normalizedName: "sqlserver", aliases: ["sql server", "mssql", "t-sql"] },
  { name: "Firebase", normalizedName: "firebase", aliases: ["firebase"] },
  { name: "Firestore", normalizedName: "firestore", aliases: ["firestore"] },
  { name: "Supabase", normalizedName: "supabase", aliases: ["supabase"] },
  { name: "CockroachDB", normalizedName: "cockroachdb", aliases: ["cockroachdb", "cockroach db"] },
  { name: "ClickHouse", normalizedName: "clickhouse", aliases: ["clickhouse"] },
  { name: "Redshift", normalizedName: "redshift", aliases: ["redshift"] },
  { name: "Pinecone", normalizedName: "pinecone", aliases: ["pinecone"] },
  { name: "Weaviate", normalizedName: "weaviate", aliases: ["weaviate"] },
  { name: "pgvector", normalizedName: "pgvector", aliases: ["pgvector"] },
  { name: "Vector Databases", normalizedName: "vector-db", aliases: ["vector database", "vector db"] },

  // More cloud / infra / DevOps
  { name: "Vercel", normalizedName: "vercel", aliases: ["vercel"] },
  { name: "Netlify", normalizedName: "netlify", aliases: ["netlify"] },
  { name: "Heroku", normalizedName: "heroku", aliases: ["heroku"] },
  { name: "DigitalOcean", normalizedName: "digitalocean", aliases: ["digitalocean", "digital ocean"] },
  { name: "Cloudflare", normalizedName: "cloudflare", aliases: ["cloudflare"] },
  { name: "Helm", normalizedName: "helm", aliases: ["helm"] },
  { name: "Istio", normalizedName: "istio", aliases: ["istio"] },
  { name: "Argo CD", normalizedName: "argocd", aliases: ["argocd", "argo cd"] },
  { name: "Prometheus", normalizedName: "prometheus", aliases: ["prometheus"] },
  { name: "Grafana", normalizedName: "grafana", aliases: ["grafana"] },
  { name: "Datadog", normalizedName: "datadog", aliases: ["datadog"] },
  { name: "Splunk", normalizedName: "splunk", aliases: ["splunk"] },
  { name: "ELK Stack", normalizedName: "elk", aliases: ["elk stack", "elastic stack"] },
  { name: "Nginx", normalizedName: "nginx", aliases: ["nginx"] },
  { name: "Ansible", normalizedName: "ansible", aliases: ["ansible"] },
  { name: "Puppet", normalizedName: "puppet", aliases: ["puppet"] },
  { name: "Pulumi", normalizedName: "pulumi", aliases: ["pulumi"] },
  { name: "HashiCorp Vault", normalizedName: "vault", aliases: ["hashicorp vault"] },
  { name: "OpenShift", normalizedName: "openshift", aliases: ["openshift"] },
  { name: "CircleCI", normalizedName: "circleci", aliases: ["circleci", "circle ci"] },
  { name: "GitLab CI", normalizedName: "gitlab-ci", aliases: ["gitlab ci", "gitlab-ci"] },
  { name: "GitHub Actions", normalizedName: "github-actions", aliases: ["github actions"] },
  { name: "Serverless", normalizedName: "serverless", aliases: ["serverless"] },
  { name: "AWS Lambda", normalizedName: "lambda", aliases: ["aws lambda"] },
  { name: "Amazon S3", normalizedName: "s3", aliases: ["amazon s3", "aws s3"] },
  { name: "Amazon EC2", normalizedName: "ec2", aliases: ["ec2", "amazon ec2"] },
  { name: "Amazon ECS", normalizedName: "ecs", aliases: ["amazon ecs", "aws ecs"] },
  { name: "Amazon EKS", normalizedName: "eks", aliases: ["amazon eks", "aws eks"] },
  { name: "Google Kubernetes Engine", normalizedName: "gke", aliases: ["gke"] },
  { name: "CloudFormation", normalizedName: "cloudformation", aliases: ["cloudformation"] },

  // Messaging / streaming
  { name: "RabbitMQ", normalizedName: "rabbitmq", aliases: ["rabbitmq"] },
  { name: "NATS", normalizedName: "nats", aliases: ["nats.io", "nats messaging"] },
  { name: "Amazon SQS", normalizedName: "sqs", aliases: ["amazon sqs", "aws sqs"] },
  { name: "Amazon SNS", normalizedName: "sns", aliases: ["amazon sns", "aws sns"] },
  { name: "Pub/Sub", normalizedName: "pubsub", aliases: ["pub/sub", "pubsub"] },
  { name: "Kinesis", normalizedName: "kinesis", aliases: ["kinesis"] },
  { name: "Apache Flink", normalizedName: "flink", aliases: ["apache flink", "flink"] },
  { name: "Apache Pulsar", normalizedName: "pulsar", aliases: ["apache pulsar"] },
  { name: "Celery", normalizedName: "celery", aliases: ["celery"] },

  // More data / ML / AI
  { name: "scikit-learn", normalizedName: "scikit-learn", aliases: ["scikit-learn", "sklearn", "scikit learn"] },
  { name: "Keras", normalizedName: "keras", aliases: ["keras"] },
  { name: "Hugging Face", normalizedName: "huggingface", aliases: ["hugging face", "huggingface"] },
  { name: "LangChain", normalizedName: "langchain", aliases: ["langchain"] },
  { name: "LlamaIndex", normalizedName: "llamaindex", aliases: ["llamaindex", "llama index"] },
  { name: "OpenAI", normalizedName: "openai", aliases: ["openai", "gpt-4", "gpt-3.5", "chatgpt"] },
  { name: "NumPy", normalizedName: "numpy", aliases: ["numpy"] },
  { name: "SciPy", normalizedName: "scipy", aliases: ["scipy"] },
  { name: "Matplotlib", normalizedName: "matplotlib", aliases: ["matplotlib"] },
  { name: "Jupyter", normalizedName: "jupyter", aliases: ["jupyter", "jupyter notebook"] },
  { name: "Hadoop", normalizedName: "hadoop", aliases: ["hadoop"] },
  { name: "Apache Hive", normalizedName: "hive", aliases: ["apache hive"] },
  { name: "Trino", normalizedName: "trino", aliases: ["trino", "prestodb"] },
  { name: "MLflow", normalizedName: "mlflow", aliases: ["mlflow"] },
  { name: "Kubeflow", normalizedName: "kubeflow", aliases: ["kubeflow"] },
  { name: "SageMaker", normalizedName: "sagemaker", aliases: ["sagemaker"] },
  { name: "Vertex AI", normalizedName: "vertex-ai", aliases: ["vertex ai"] },
  { name: "XGBoost", normalizedName: "xgboost", aliases: ["xgboost"] },
  { name: "NLP", normalizedName: "nlp", aliases: ["natural language processing", "nlp"] },
  { name: "Computer Vision", normalizedName: "computer-vision", aliases: ["computer vision"] },
  { name: "Deep Learning", normalizedName: "deep-learning", aliases: ["deep learning"] },
  { name: "RAG", normalizedName: "rag", aliases: ["retrieval augmented generation", "retrieval-augmented generation"] },
  { name: "MLOps", normalizedName: "mlops", aliases: ["mlops"] },
  { name: "ETL", normalizedName: "etl", aliases: ["etl", "elt"] },
  { name: "Tableau", normalizedName: "tableau", aliases: ["tableau"] },
  { name: "Power BI", normalizedName: "powerbi", aliases: ["power bi", "powerbi"] },
  { name: "Looker", normalizedName: "looker", aliases: ["looker"] },

  // Testing
  { name: "Jest", normalizedName: "jest", aliases: ["jest"] },
  { name: "Cypress", normalizedName: "cypress", aliases: ["cypress"] },
  { name: "Playwright", normalizedName: "playwright", aliases: ["playwright"] },
  { name: "Selenium", normalizedName: "selenium", aliases: ["selenium"] },
  { name: "Vitest", normalizedName: "vitest", aliases: ["vitest"] },
  { name: "pytest", normalizedName: "pytest", aliases: ["pytest"] },
  { name: "JUnit", normalizedName: "junit", aliases: ["junit"] },
  { name: "RSpec", normalizedName: "rspec", aliases: ["rspec"] },
  { name: "Postman", normalizedName: "postman", aliases: ["postman"] },

  // Architecture / methods / auth
  { name: "Agile", normalizedName: "agile", aliases: ["agile"] },
  { name: "Scrum", normalizedName: "scrum", aliases: ["scrum"] },
  { name: "Kanban", normalizedName: "kanban", aliases: ["kanban"] },
  { name: "TDD", normalizedName: "tdd", aliases: ["tdd", "test-driven development", "test driven development"] },
  { name: "DevOps", normalizedName: "devops", aliases: ["devops"] },
  { name: "Microservices", normalizedName: "microservices", aliases: ["microservices", "microservice"] },
  { name: "Domain-Driven Design", normalizedName: "ddd", aliases: ["domain-driven design", "domain driven design"] },
  { name: "Event-Driven Architecture", normalizedName: "event-driven", aliases: ["event-driven architecture", "event driven architecture"] },
  { name: "OAuth", normalizedName: "oauth", aliases: ["oauth", "oauth2", "oauth 2.0"] },
  { name: "OpenID Connect", normalizedName: "oidc", aliases: ["openid connect", "oidc"] },
  { name: "SAML", normalizedName: "saml", aliases: ["saml"] },
  { name: "JWT", normalizedName: "jwt", aliases: ["jwt", "json web token"] },
  { name: "WebSockets", normalizedName: "websockets", aliases: ["websocket", "websockets"] },
  { name: "Distributed Systems", normalizedName: "distributed-systems", aliases: ["distributed systems"] },
];
