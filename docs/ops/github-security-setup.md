# GitHub Security and Governance Setup

This document lists the exact toggles the repository owner MUST flip in the GitHub Settings interface. The automated agent cannot modify these settings via the API due to permission constraints on the sandbox token.

## 1. Commit Signing

All commits to `main` must be cryptographically signed to prove provenance.

1. Navigate to **Settings → General**.
2. Scroll down to **Pull Requests**.
3. Check **Require sign-off on web-based commits**.
4. To sign local commits, configure your local Git environment with an SSH or GPG key and run:
   ```bash
   git config --global commit.gpgsign true
   git config --global user.signingkey <YOUR_KEY_ID>
   ```

## 2. Branch Protection Rules

`main` must not accept direct pushes or unreviewed code.

1. Navigate to **Settings → Branches**.
2. Click **Add branch ruleset**.
3. Name it `Protect main` and target the `main` branch.
4. Enable the following rules:
   - **Require a pull request before merging** (Require 1 approval).
   - **Require status checks to pass** (Require `verify` job to pass).
   - **Require conversation resolution before merging**.
   - **Require linear history**.
   - **Block force pushes**.

## 3. Security Features

The repository must actively scan for vulnerabilities and secrets.

1. Navigate to **Settings → Security & analysis**.
2. **Dependabot alerts:** Click **Enable**.
3. **Dependabot security updates:** Click **Enable**.
4. **Secret scanning:** Click **Enable**.
5. **Private vulnerability reporting:** Click **Enable**.
6. **Code scanning:** The `.github/workflows/codeql.yml` file handles this automatically once committed, but you must ensure GitHub Actions has permission to read the repository.

## 4. Repository Visibility

The repository is currently PUBLIC. If this is a proprietary, sellable asset, it must be made private.

1. Navigate to **Settings → General**.
2. Scroll to the **Danger Zone** at the very bottom.
3. Click **Change visibility** and select **Make private**.
