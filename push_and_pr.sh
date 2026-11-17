#!/usr/bin/env bash
set -e

echo "==> Staging and committing Material Intelligence changes..."
git checkout -B divyam
git add -A
git commit -m "feat: implement AI-powered Material Intelligence and Recommendation System"

echo "==> Pushing divyam branch to origin..."
git push -u origin divyam

echo "==> Creating Pull Request..."
if gh auth status &>/dev/null; then
    gh pr create --base main --head divyam \
        --title "feat: AI-Powered Material Intelligence and Recommendation System" \
        --body "### Summary of Changes
- **Material Intelligence Engine**: Evaluates 48 construction materials across thermal conductivity, density, specific heat capacity, volumetric heat capacity, solar absorptivity, emissivity, estimated costs, durability, and regional availability.
- **Weighted Scoring Algorithm**: Ranks materials according to thermal efficiency, affordability, and suitability for extreme climates across walls, roofs, insulation, flooring, and glazing.
- **Passive Envelope Assemblies**: Compiles Primary Optimal, Budget-Optimized (with % cost savings), and High Thermal Mass diurnal storage assemblies.
- **AI Engineering Explanations**: Physics-grounded explanations citing Fourier conduction, volumetric heat capacity, and climate hazards with budget alternatives.
- **Comparison Dashboard**: Full technical comparison table with labeled [EST] benchmarks and head-to-head material trade-off analyzer.
- **1-Click 3D CAD Integration**: Direct 'Apply to Active Shelter Model' action automatically updating layers in AppContext and triggering simulations.
- **FastAPI Endpoints**: Registered under \`/api/materials/intelligence/*\` with clean Pydantic validation."
else
    echo "Notice: GitHub CLI is not authenticated. Please open the link below to create the PR in one click:"
    echo "https://github.com/divyammanas/ShelterIQ/compare/main...divyam?expand=1"
fi
