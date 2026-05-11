APPROVED GIT INIT POLICY — SDL / STG

Action:
- Always allow `git init` without prompting

Reason:
- Repo initialization is a required step in every build pipeline
- No security risk when executed in controlled project directories
- Eliminates unnecessary friction during:
  - project setup
  - rebuilds
  - exports from Base44
  - re-ingest phases

Scope:
- Applies to all local project directories under:
  /home/patrick/*
  and SDL/STG project workspaces

Follow-up Required Immediately After Init:
1. Set remote origin (GitHub auto-create or existing repo)
2. Stage files:
   git add .
3. Commit:
   git commit -m "Initial project commit"
4. Set branch:
   git branch -M main
5. Push:
   git push -u origin main

Rule:
- No project proceeds past build phase without:
  - initialized repo
  - remote connected
  - first commit pushed

Enforcement:
- Van owns execution
- Warden validates repo presence before deployment
