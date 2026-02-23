---
id: r-2aef
status: closed
deps: []
links: []
created: 2026-02-23T06:01:22Z
type: feature
priority: 1
assignee: Alexander Mangel
tags: [feature, cli, config]
---
# CLI `board` command + ~/.ramboard/ config + auto-add projects + 2-letter sidebar

Replace hardcoded config with ~/.ramboard/config.json. CLI `board` command auto-adds CWD if it has .tickets/, starts server, opens browser. Sidebar shows 2-letter abbreviations.



## Goal
Replace hardcoded config with ~/.ramboard/config.json. CLI `board` command auto-adds CWD if it has .tickets/, starts server, opens browser. Sidebar shows 2-letter abbreviations.

## Acceptance Criteria
- [ ] ~/.ramboard/config.json stores project list persistently
- [ ] Running `board` in a dir with .tickets/ adds it to config
- [ ] Running `board` starts server + opens browser
- [ ] If already running, just opens browser
- [ ] Browser opens to the project page if run from a project dir
- [ ] Sidebar shows 2-letter abbreviations
- [ ] Server reads config from ~/.ramboard/config.json
- [ ] API endpoint to list/add/remove projects dynamically

## Verification
- [ ] cd ~/Projects/trek && board → opens browser at /trek
- [ ] cd ~/Projects/newproject && board → adds to sidebar
- [ ] Sidebar shows Tr, Bh, TR, Pi instead of T, B, T, P

## Worktree
- .
