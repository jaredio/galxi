# 🧭 Galxi Dashboard Refinement Plan

This document outlines improvements for the **Galxi Dashboard** to achieve a production-grade, professional UI that aligns with Galxi’s brand aesthetic and enterprise goals.

---

## 🎯 1. Core Goals

- Improve visual hierarchy and readability across panels
- Simplify terminology and align with real-world **Azure infrastructure concepts**
- Introduce light data visualizations (progress bars, sparklines)
- Enhance depth, interactivity, and brand consistency
- Define a clear, professional layout structure that can scale with new metrics

---

## 🧩 2. Dashboard Structure Overview

### 🧠 **Current Sections**

| Section | Purpose | Status |
|----------|----------|---------|
| Summary Overview | High-level node, group, and connection stats | Good, needs renaming & layout tuning |
| Group & Node Hierarchy | Nested tree of resources | Functional, needs more focus visuals |
| Relationship Insights | Contextual data of selected items | Great concept, polish visuals |
| Contextual Analysis | Relationship view for selected nodes | Keep as sidebar or subpanel |

---

## 🧾 3. Proposed New Section Names

| Current Title | Proposed Title | Rationale |
|----------------|----------------|------------|
| **Summary Overview** | **Infrastructure Overview** | Feels more cloud-oriented, like Azure “Resource Overview” |
| **Infrastructure health at a glance** | **Deployment Health Snapshot** | Sounds operational, dashboard-ready |
| **Total Nodes** | **Compute Resources** | “Nodes” can sound abstract — more Azure-familiar |
| **Total Groups** | **Network Scopes** | Encompasses vNets, subnets, and logical groupings |
| **Connections** | **Linked Relationships** | Matches your topology language |
| **Active vs Inactive** | **Resource Status** | Simpler phrasing |
| **Group Type Breakdown** | **Network Composition** | More cloud-native tone |
| **Node Inventory** | **Resource Inventory** | Matches Azure “Inventory” or “Assets” |
| **Group & Node Hierarchy** | **Topology View** | Cleaner, industry-standard phrasing |
| **Contextual Analysis** | **Selected Resource Context** | Feels more analytic, descriptive |

---

## 🎨 4. Visual & Aesthetic Improvements

### 🌗 Dark UI Enhancements
- Add soft **card layering** with slight translucency  
  ```css
  background: rgba(15, 17, 20, 0.75);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(70, 255, 170, 0.06);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
  border-radius: 12px;
  transition: all 0.2s ease-in-out;

  Remove all harsh glows — replace with subtle edge lighting (border-green-400/20 on hover)

Keep color accents exclusively Galxi Green (#33ff99) and Slate Gray for depth contrast.

📏 Spacing & Grid

Use a 16px grid system for spacing consistency.

Increase top section height slightly — give the Overview section “hero weight.”

Add faint dividers between rows of metrics.

✨ Typography

Headers: text-lg font-semibold text-gray-100

Subheaders: uppercase text-xs tracking-wide text-gray-400

Metrics: text-3xl font-bold text-green-400

Context/Labels: text-sm text-gray-500
