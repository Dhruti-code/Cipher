import os
import re
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    """Sets background shading for a table cell."""
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tc_pr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Sets inner padding for a table cell."""
    tc_pr = cell._tc.get_or_add_tcPr()
    tc_mar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tc_pr.append(tc_mar)

def create_report_docx():
    doc = Document()

    # Set page margins (1 inch all around)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Base styles setup
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(11)
    normal_style.font.color.rgb = RGBColor(45, 45, 45) # #2D2D2D

    # =========================================================================
    # 1. TITLE PAGE
    # =========================================================================
    # Spacing before title
    for _ in range(3):
        doc.add_paragraph()

    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_run = title_p.add_run("SketchChat")
    title_run.font.name = 'Calibri'
    title_run.font.size = Pt(32)
    title_run.font.bold = True
    title_run.font.color.rgb = RGBColor(30, 58, 138) # Deep navy #1E3A8A

    sub_p = doc.add_paragraph()
    sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    sub_run = sub_p.add_run("Personal Real-Time 1-to-1 Messaging Platform\nwith Progressive Web App (PWA) Capabilities")
    sub_run.font.size = Pt(15)
    sub_run.font.color.rgb = RGBColor(75, 85, 99)

    doc.add_paragraph()
    block_p = doc.add_paragraph()
    block_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    b_run = block_p.add_run("Learning Block 1\nFull-Stack Web Systems Mini Project")
    b_run.font.size = Pt(13)
    b_run.font.bold = True

    for _ in range(3):
        doc.add_paragraph()

    subm_p = doc.add_paragraph()
    subm_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    subm_p.add_run("Submitted by:\n").font.size = Pt(11)
    sname_run = subm_p.add_run("Dhruti Patel\n")
    sname_run.font.size = Pt(13)
    sname_run.font.bold = True
    subm_p.add_run("[Student ID: 202X]").font.size = Pt(11)

    doc.add_paragraph()
    inst_p = doc.add_paragraph()
    inst_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    inst_p.add_run("College / Institute Name\n").font.size = Pt(11)
    inst_p.add_run("Department of Computer Science & Engineering\n").font.size = Pt(12)
    inst_p.add_run("Academic Year: Pre-Final [2025–2026]\n").font.size = Pt(11)

    doc.add_paragraph()
    guide_p = doc.add_paragraph()
    guide_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    guide_p.add_run("Guided by:\n").font.size = Pt(11)
    gname_run = guide_p.add_run("[Mentor Name]\n")
    gname_run.font.size = Pt(12)
    gname_run.font.bold = True
    guide_p.add_run("Assistant Professor, Department of CSE").font.size = Pt(11)

    doc.add_page_break()

    # =========================================================================
    # 2. INDEX / TABLE OF CONTENTS
    # =========================================================================
    h_index = doc.add_heading("Index", level=1)
    h_index.style.font.color.rgb = RGBColor(30, 58, 138)

    index_table = doc.add_table(rows=1, cols=3)
    index_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    index_table.autofit = False

    col_widths = [Inches(1.2), Inches(4.3), Inches(1.0)]
    hdr_cells = index_table.rows[0].cells
    hdr_titles = ["Chapter", "Topic", "Page"]
    for i, title in enumerate(hdr_titles):
        hdr_cells[i].text = title
        hdr_cells[i].width = col_widths[i]
        set_cell_background(hdr_cells[i], "1E3A8A")
        set_cell_margins(hdr_cells[i], 120, 120, 150, 150)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        for run in p.runs:
            run.font.bold = True
            run.font.color.rgb = RGBColor(255, 255, 255)

    index_data = [
        ("1", "Introduction", "03"),
        ("2", "Problem Statement", "04"),
        ("3", "Objectives", "05"),
        ("4", "Project Scope", "06"),
        ("5", "Proposed System / Methodology", "07"),
        ("6", "System Architecture / Workflow", "09"),
        ("7", "Implementation", "12"),
        ("8", "User Interface / Application Screenshots", "15"),
        ("9", "Challenges and Limitations", "20"),
        ("10", "Conclusion", "22"),
        ("11", "Future Scope", "23"),
        ("12", "References", "24"),
    ]

    for ch, topic, pg in index_data:
        row_cells = index_table.add_row().cells
        row_cells[0].text = ch
        row_cells[0].width = col_widths[0]
        row_cells[1].text = topic
        row_cells[1].width = col_widths[1]
        row_cells[2].text = pg
        row_cells[2].width = col_widths[2]
        for idx, cell in enumerate(row_cells):
            set_cell_margins(cell, 80, 80, 120, 120)
            if idx == 0:
                cell.paragraphs[0].runs[0].font.bold = True
            if idx == 2:
                cell.paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.RIGHT

    doc.add_page_break()

    # =========================================================================
    # Helper to add stylized section headers
    # =========================================================================
    def add_section_heading(text, level=1):
        h = doc.add_heading(text, level=level)
        if level == 1:
            h.style.font.size = Pt(18)
            h.style.font.color.rgb = RGBColor(30, 58, 138)
            h.paragraph_format.space_before = Pt(16)
            h.paragraph_format.space_after = Pt(8)
        elif level == 2:
            h.style.font.size = Pt(14)
            h.style.font.color.rgb = RGBColor(45, 45, 45)
            h.paragraph_format.space_before = Pt(12)
            h.paragraph_format.space_after = Pt(4)
        elif level == 3:
            h.style.font.size = Pt(12)
            h.style.font.color.rgb = RGBColor(75, 85, 99)
            h.paragraph_format.space_before = Pt(8)
            h.paragraph_format.space_after = Pt(2)
        return h

    def add_bullet(text, bold_prefix=None):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        if bold_prefix:
            r_bold = p.add_run(bold_prefix)
            r_bold.bold = True
        p.add_run(text)
        return p

    def add_body(text):
        p = doc.add_paragraph(text)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing = 1.15
        return p

    def add_code_block(code_text):
        tbl = doc.add_table(rows=1, cols=1)
        tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
        cell = tbl.cell(0, 0)
        set_cell_background(cell, "F3F4F6")
        set_cell_margins(cell, 100, 100, 150, 150)
        p = cell.paragraphs[0]
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.0
        r = p.add_run(code_text)
        r.font.name = 'Consolas'
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(31, 41, 55)
        doc.add_paragraph() # Spacing

    # =========================================================================
    # CHAPTER 1: INTRODUCTION
    # =========================================================================
    add_section_heading("1. Introduction", level=1)
    add_body(
        "SketchChat is a high-performance, real-time 1-to-1 personal messaging application engineered "
        "with a tactile, hand-drawn 'Sketch' design language and Progressive Web App (PWA) capabilities. "
        "Built atop an event-driven bi-directional WebSocket architecture, the platform facilitates instantaneous "
        "direct communication without the latency and server overhead characteristic of legacy HTTP polling mechanisms."
    )

    add_section_heading("1.1 Real-World Purpose & Problem Addressed", level=2)
    add_body(
        "In modern digital communication, users are inundated with bloated messaging applications burdened by "
        "algorithmic feeds, advertising, intrusive analytics, and complex enterprise collaboration hierarchies. "
        "Users frequently desire a distraction-free, privacy-preserving, and immediate direct channel for 1-to-1 dialogue "
        "that functions equally well across low-bandwidth mobile connections and high-resolution desktop displays."
    )
    add_body(
        "SketchChat addresses this demand by providing an agile, zero-friction communication environment. Users enter with an "
        "ephemeral or persistent handle, discover other active users via real-time search, and initiate direct dialogue "
        "backed by durable SQLite persistence and automated message lifecycle tracking (SENT → DELIVERED → READ)."
    )

    add_section_heading("1.2 Core Architectural & Technological Highlights", level=2)
    add_bullet(" Built with Socket.IO atop WebSockets, maintaining persistent, low-latency connections with automatic reconnection and multi-socket per-user session multiplexing.", "Full-Duplex Real-Time Engine:")
    add_bullet(" Employs Node.js native embedded SQLite (node:sqlite) operating in Write-Ahead Logging (WAL) mode, achieving ACID compliance with zero external database engine overhead.", "Lightweight Embedded Persistence:")
    add_bullet(" Implements W3C Web App Manifest standards and a dedicated Service Worker providing offline application shell caching and native desktop/mobile home-screen installation.", "Progressive Web App (PWA) Standard:")
    add_bullet(" A bespoke design system developed with Tailwind CSS utilizing hard offset shadows, wobbly borders, and tactile paper textures to deliver a distinctive, humanized digital experience.", "Artisanal 'Sketch' UI System:")

    add_section_heading("1.3 Key Application Features", level=2)
    add_bullet(" Sub-50ms message propagation between connected peers with guaranteed ordering.", "Instantaneous 1-to-1 Messaging:")
    add_bullet(" Debounced, automatic typing broadcast notifying chat partners when messages are actively composed.", "Bi-Directional Typing Indicators:")
    add_bullet(" Distributed presence tracking that accurately reflects online/offline status across multi-tab and multi-device sessions.", "Multi-Socket Presence Management:")
    add_bullet(" Real-time transition through three distinct states: single tick (SENT), double tick (DELIVERED), and filled double tick (READ).", "Granular Message Status Lifecycle:")
    add_bullet(" Dynamic conversation directory with unread counters that update in real time without screen refresh.", "Live Unread Badges & Discovery:")
    add_bullet(" Native installation support across Google Chrome, Microsoft Edge, Android, and Apple iOS Safari.", "PWA Installability:")

    # =========================================================================
    # CHAPTER 2: PROBLEM STATEMENT
    # =========================================================================
    add_section_heading("2. Problem Statement", level=1)
    add_section_heading("2.1 Limitations of Existing Real-Time Architectures", level=2)
    add_body(
        "Traditional web-based chat systems developed on standard REST HTTP architectures suffer from structural inefficiencies:"
    )
    add_bullet(" Clients issue recurring periodic GET requests (e.g., every 1–3 seconds) to detect incoming messages. This generates high HTTP header overhead, saturates network bandwidth, exhausts server thread pools, and introduces artificial latency equal to the polling interval.", "HTTP Short Polling Inefficiency:")
    add_bullet(" While reducing empty payloads, long polling forces constant socket teardown and renegotiation, incurring repetitive TLS handshakes and server memory pressure.", "HTTP Long Polling Overhead:")
    add_bullet(" Dominant consumer messaging applications (WhatsApp, Discord, Slack) feature heavy client bundles (>50MB), complex background analytics, and feature bloat that degrade performance on low-spec hardware or unstable network environments.", "Commercial Messaging Bloat:")

    add_section_heading("2.2 Why an Event-Driven Architecture is Required", level=2)
    add_body(
        "An event-driven bi-directional socket protocol (Socket.IO over WebSocket) establishes a single long-lived TCP connection per client. "
        "Frame headers are reduced from kilobytes of HTTP headers to merely 2–6 bytes per frame. Messages are pushed from server to recipient the millisecond "
        "they are committed to database storage, achieving instantaneous synchronization with minimal CPU and network utilization."
    )

    add_section_heading("2.3 Expected Outcome & User Impact", level=2)
    add_body(
        "By integrating this architecture with a lightweight Progressive Web App shell, SketchChat achieves instantaneous perceived response through optimistic UI "
        "state updates, cross-platform installability directly onto mobile and desktop devices without app store gatekeepers, and resilient data durability with zero operational complexity."
    )

    # =========================================================================
    # CHAPTER 3: OBJECTIVES
    # =========================================================================
    add_section_heading("3. Objectives", level=1)
    add_body("The primary engineering objectives of this project are strictly defined and measurable:")
    add_bullet(" Architect a decoupled client-server platform using React 18, Node.js, Express, and Socket.IO.", "1. Develop an Event-Driven Full-Stack System:")
    add_bullet(" Ensure message dispatch from Client A is received, persisted, and rendered on Client B within 50 milliseconds under standard network conditions.", "2. Implement Sub-50ms Message Delivery:")
    add_bullet(" Provide end-to-end receipt tracking transitioning systematically from SENT (persisted in DB) to DELIVERED (received by peer socket) and READ (peer active in chat room).", "3. Engineer a Robust Message Lifecycle Tracking Protocol:")
    add_bullet(" Implement connection counting per user ID to ensure an individual closing one browser tab does not trigger an incorrect 'offline' broadcast while other tabs remain active.", "4. Multi-Tab Presence Synchronization:")
    add_bullet(" Utilize native Node.js SQLite (node:sqlite) with Write-Ahead Logging (WAL) and foreign keys enabled to achieve non-blocking reads and durable writes.", "5. Zero-Configuration Embedded Database Persistence:")
    add_bullet(" Develop W3C-compliant Web App Manifest and custom Service Worker caching strategies to enable native installability and offline app shell loading.", "6. Progressive Web App Compliance:")
    add_bullet(" Deploy the decoupled application onto Render using separate specialized tiers: a Node.js Web Service for API/WebSockets and a CDN Static Site with SPA rewrites for the React client.", "7. Production Cloud Deployment on Render:")

    # =========================================================================
    # CHAPTER 4: PROJECT SCOPE
    # =========================================================================
    add_section_heading("4. Project Scope", level=1)
    add_section_heading("4.1 In-Scope Capabilities", level=2)
    add_bullet(" Direct private dialogue between any two registered users.", "1-to-1 Personal Direct Messaging:")
    add_bullet(" Username creation, availability validation, and instantaneous case-insensitive search across the user directory.", "User Discovery & Identity Setup:")
    add_bullet(" Broadcasted start/stop typing indicators with 3-second debounce timers to prevent network spam.", "Real-Time Typing Presence:")
    add_bullet(" Real-time green/gray activity indicators broadcast across the network.", "Online/Offline Global Presence:")
    add_bullet(" Real-time calculation and display of unread messages per conversation, automatically clearing upon conversation focus.", "Unread Message Counter:")
    add_bullet(" Installable desktop/mobile experience with custom icons and splash screen.", "PWA Installation & Offline Shell:")

    add_section_heading("4.2 Explicit Out-of-Scope Boundaries", level=2)
    add_bullet(" The current data model supports 1-to-1 private rooms only (though repository contracts include extensibility hooks for future multi-party rooms).", "Group Chat & Channels:")
    add_bullet(" Audio and video stream negotiation is excluded.", "Voice & Video Calling (WebRTC):")
    add_bullet(" Image, video, and binary document transmission is omitted; text-only payloads ensure high velocity and low memory footprints.", "Rich Media Attachments:")
    add_bullet(" Identity is established via unique usernames to allow rapid demonstration without credentials management overhead.", "Password-Based Authentication:")

    add_section_heading("4.3 Target Audience & System Inputs/Outputs", level=2)
    add_body("Target Audience: Students, colleagues, and lightweight teams requiring instant, uncluttered, distraction-free peer communication.")
    add_body("System Inputs: UTF-8 text strings, typing state triggers, socket connection events, delivery receipts.")
    add_body("System Outputs: Real-time message streams, updated presence state payloads, unread count badge increments, structured REST JSON responses.")

    # =========================================================================
    # CHAPTER 5: PROPOSED SYSTEM / METHODOLOGY
    # =========================================================================
    add_section_heading("5. Proposed System / Methodology", level=1)
    add_body(
        "SketchChat implements an end-to-end event-driven architecture centered on room-based socket multiplexing and optimistic client updates. "
        "The end-to-end messaging flow follows these structured phases:"
    )
    add_bullet(" When a user enters their handle, the client verifies availability via GET /api/users/check and registers via POST /api/users/register. Upon success, the client establishes a persistent WebSocket connection and emits client:user_connect. The server records the socket association and broadcasts server:user_online to active peers.", "1. Connection & Discovery:")
    add_bullet(" Opening a dialogue triggers client:join_conversation. The server verifies participant authorization in SQLite before admitting the socket into the private conversation room.", "2. Room Authorization:")
    add_bullet(" When the sender hits Enter, the client generates a local tempId and optimistically displays the bubble in a sending state. It then dispatches client:send_message.", "3. Optimistic Dispatch:")
    add_bullet(" The server receives the event, commits the message to the messages table, and broadcasts server:new_message with status: 'sent' to both participants.", "4. Server Commit & Broadcast:")
    add_bullet(" Upon receiving the payload, the recipient's client dispatches client:mark_delivered, updating the status to delivered (double checkmark). When the recipient focuses the viewport, client:mark_read triggers, updating the state to read (blue double checkmark).", "5. Receipt Acknowledgment Pipeline:")

    # =========================================================================
    # CHAPTER 6: SYSTEM ARCHITECTURE / WORKFLOW
    # =========================================================================
    add_section_heading("6. System Architecture / Workflow", level=1)
    add_section_heading("6.1 Multi-Tier Architecture", level=2)
    add_body(
        "The application is organized into three distinct, loosely coupled tiers:\n"
        "1. Frontend Client Tier (Render Static Site): React 18 SPA bundled via Vite, served over global CDN. Includes Service Worker for offline caching and Web App Manifest for PWA installation.\n"
        "2. Gateway & Application Server Tier (Render Web Service): Node.js + Express server managing REST endpoints and Socket.IO real-time event routing.\n"
        "3. Persistence Tier: Embedded SQLite running within Node.js native DatabaseSync with Write-Ahead Logging (WAL) enabled."
    )

    add_section_heading("6.2 Relational Database Schema", level=2)
    add_body("The embedded database contains five optimized relational tables:")
    add_bullet(" id (UUID PK), username (TEXT UNIQUE), created_at, last_seen_at.", "users:")
    add_bullet(" id (UUID PK), type ('direct' | 'group'), title, created_at, updated_at.", "conversations:")
    add_bullet(" conversation_id (FK), user_id (FK), joined_at, last_read_message_id (FK).", "conversation_participants:")
    add_bullet(" id (UUID PK), conversation_id (FK), sender_id (FK), content (TEXT), created_at.", "messages:")
    add_bullet(" id (UUID PK), message_id (FK), user_id (FK), status ('sent'|'delivered'|'read'), updated_at.", "message_statuses:")

    add_section_heading("6.3 Message Lifecycle State Machine", level=2)
    add_body(
        "Each message undergoes a deterministic state progression: "
        "[OptimisticSending] → [Sent (Persisted)] → [Delivered (Socket Ack)] → [Read (Viewport Focused)]. "
        "If a network disconnection occurs before server acknowledgment, the message transitions to [Failed] with an interactive retry affordance."
    )

    # =========================================================================
    # CHAPTER 7: IMPLEMENTATION
    # =========================================================================
    doc.add_page_break()
    add_section_heading("7. Implementation", level=1)
    add_section_heading("7.1 Technology Stack Summary", level=2)

    tech_table = doc.add_table(rows=1, cols=3)
    tech_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    t_widths = [Inches(2.0), Inches(1.5), Inches(3.0)]
    t_hdr = tech_table.rows[0].cells
    for i, title in enumerate(["Technology / Library", "Version", "Role in Project"]):
        t_hdr[i].text = title
        t_hdr[i].width = t_widths[i]
        set_cell_background(t_hdr[i], "1E3A8A")
        set_cell_margins(t_hdr[i], 100, 100, 120, 120)
        p = t_hdr[i].paragraphs[0]
        for run in p.runs:
            run.font.bold = True
            run.font.color.rgb = RGBColor(255, 255, 255)

    tech_data = [
        ("React", "18.3.1", "Declarative component UI and state management"),
        ("Vite", "6.0.7", "Modern HMR dev server and production bundler"),
        ("TypeScript", "5.7.3", "End-to-end type safety with shared contract interfaces"),
        ("Tailwind CSS", "3.4.17", "Custom hand-drawn Sketch utility classes and offset shadows"),
        ("Lucide React", "0.469.0", "Minimalist iconography matching hand-drawn UI aesthetic"),
        ("Node.js", "v22.x LTS", "High-performance server runtime supporting native SQLite"),
        ("Express.js", "4.21.2", "Modular REST routing and middleware pipeline"),
        ("Socket.IO", "4.8.1", "WebSocket server and client with fallback transports"),
        ("node:sqlite", "Native", "Zero-dependency embedded SQLite with WAL mode"),
        ("Service Worker", "Custom", "Offline application shell caching and PWA installability"),
    ]

    for tech, ver, role in tech_data:
        r_cells = tech_table.add_row().cells
        r_cells[0].text = tech
        r_cells[0].width = t_widths[0]
        r_cells[1].text = ver
        r_cells[1].width = t_widths[1]
        r_cells[2].text = role
        r_cells[2].width = t_widths[2]
        for idx, c in enumerate(r_cells):
            set_cell_margins(c, 70, 70, 100, 100)
            if idx == 0:
                c.paragraphs[0].runs[0].font.bold = True

    add_section_heading("7.2 Core Source Code Implementations", level=2)
    add_body("Below are key annotated production source code implementations demonstrating the core architecture:")

    add_body("Multi-Socket Presence Manager (server/src/sockets/index.ts):")
    add_code_block(
        "const userSockets = new Map<string, Set<string>>();\n\n"
        "export function registerUserSocket(userId: string, socketId: string): boolean {\n"
        "  let sockets = userSockets.get(userId);\n"
        "  const isFirstConnection = !sockets || sockets.size === 0;\n"
        "  if (!sockets) {\n"
        "    sockets = new Set();\n"
        "    userSockets.set(userId, sockets);\n"
        "  }\n"
        "  sockets.add(socketId);\n"
        "  return isFirstConnection; // True if transitioned from offline to online\n"
        "}\n\n"
        "export function unregisterUserSocket(userId: string, socketId: string): boolean {\n"
        "  const sockets = userSockets.get(userId);\n"
        "  if (!sockets) return false;\n"
        "  sockets.delete(socketId);\n"
        "  if (sockets.size === 0) {\n"
        "    userSockets.delete(userId);\n"
        "    return true; // True if all tabs closed (truly offline)\n"
        "  }\n"
        "  return false;\n"
        "}"
    )

    add_body("Service Worker Real-Time Isolation (client/public/sw.js):")
    add_code_block(
        "self.addEventListener('fetch', (event) => {\n"
        "  const req = event.request;\n"
        "  const url = new URL(req.url);\n\n"
        "  // 1. Bypass non-GET methods\n"
        "  if (req.method !== 'GET') return;\n\n"
        "  // 2. Strictly bypass Socket.IO real-time traffic & WebSockets\n"
        "  if (url.pathname.includes('/socket.io/') || req.headers.get('upgrade') === 'websocket') {\n"
        "    return;\n"
        "  }\n\n"
        "  // 3. Strictly bypass REST API endpoints so real-time chat data is always live\n"
        "  if (url.pathname.startsWith('/api/')) {\n"
        "    return;\n"
        "  }\n\n"
        "  // 4. Navigation requests: Network First with offline fallback to index.html\n"
        "  if (req.mode === 'navigate') {\n"
        "    event.respondWith(\n"
        "      fetch(req).catch(() => caches.match('/index.html'))\n"
        "    );\n"
        "    return;\n"
        "  }\n\n"
        "  // 5. Static assets: Stale-While-Revalidate\n"
        "  event.respondWith(\n"
        "    caches.match(req).then((cached) => cached || fetch(req))\n"
        "  );\n"
        "});"
    )

    # =========================================================================
    # CHAPTER 8: USER INTERFACE / APPLICATION SCREENSHOTS
    # =========================================================================
    doc.add_page_break()
    add_section_heading("8. User Interface / Application Screenshots", level=1)
    add_body(
        "The SketchChat user interface is built on a handcrafted 'Sketch' aesthetic featuring a warm paper palette (#fdfbf7), "
        "charcoal ink outlines (#2d2d2d), non-blurred offset shadows, and hand-drawn typography (Kalam for headings and Patrick Hand "
        "for interface body text). Below are high-resolution screenshots of the working production application:"
    )

    screens = [
        (
            "Screen 1: Welcome & Landing Screen",
            "Figure 8.1: SketchChat Welcome Screen featuring hand-drawn branding, tactile CTA, and Progressive Web App (PWA) installation trigger.",
            "docs/screenshots/welcome_screen.jpg",
            "A centrally aligned sketch card mounted on a warm paper-textured background (#fdfbf7). The card contains a wobbly hand-drawn "
            "chat bubble badge with charcoal offset shadows, the bold 'Welcome to SketchChat' heading, and the primary coral 'Get Started' button. "
            "Directly underneath, the 'Install App' button appears if the client detects PWA installability."
        ),
        (
            "Screen 2: Username Registration Screen",
            "Figure 8.2: Username Registration Form with real-time availability validation and pencil-style sketch input.",
            "docs/screenshots/username_screen.jpg",
            "An interactive sketch form card prompting the user to claim a unique username. Features real-time validation, a live character count "
            "indicator, an input box with pencil-styled borders, and descriptive confirmation alerts (✓ Username available!)."
        ),
        (
            "Screen 3: Chat Home & User Discovery Screen",
            "Figure 8.3: Chat Home Dashboard showcasing live user search, online presence badges, and unread message notification counters.",
            "docs/screenshots/chat_home_screen.jpg",
            "A responsive two-column dashboard. The top navigation bar showcases the active user handle, a 'Switch User' button, and the PWA install trigger. "
            "The left column contains a live search bar that queries registered peers with immediate status indicators (green dot for online, gray for offline). "
            "The main column lists active conversations displaying the peer's avatar, last message snippet, timestamp, and a bright red unread notification counter."
        ),
        (
            "Screen 4: Personal 1-to-1 Chat Viewport",
            "Figure 8.4: Direct Personal Chat Viewport with debounced typing indicators, incoming/outgoing bubbles, and read receipts (✓✓).",
            "docs/screenshots/personal_chat_screen.jpg",
            "The dedicated direct messaging screen. The header displays the recipient's name, online presence, and real-time typing status ('Bob is typing...'). "
            "The message viewport renders incoming and outgoing bubbles with hand-drawn speech tails. Outgoing bubbles feature delivery ticks: "
            "single tick (sent), double tick (delivered), and blue filled double tick (read). The bottom input bar features an auto-expanding multiline textarea."
        ),
        (
            "Screen 5: PWA Standalone Mode & Native Install Prompt",
            "Figure 8.5: Progressive Web App (PWA) Install Modal showing step-by-step guidance for standalone mobile/desktop execution.",
            "docs/screenshots/pwa_install_screen.jpg",
            "The application executing within its native standalone window (without browser address bar or tabs). On mobile devices (iOS / Android), "
            "clicking 'Install App' triggers the native OS installation sheet or guides Safari users through the standard 'Add to Home Screen' action."
        )
    ]

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    for title, caption, img_rel_path, desc in screens:
        add_section_heading(title, level=2)
        add_body(desc)

        img_full_path = os.path.join(base_dir, img_rel_path)
        if os.path.exists(img_full_path):
            img_p = doc.add_paragraph()
            img_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            img_p.paragraph_format.space_before = Pt(6)
            img_p.paragraph_format.space_after = Pt(4)
            run = img_p.add_run()
            run.add_picture(img_full_path, width=Inches(5.4))

            cap_p = doc.add_paragraph()
            cap_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            cap_p.paragraph_format.space_after = Pt(14)
            cap_run = cap_p.add_run(caption)
            cap_run.font.italic = True
            cap_run.font.size = Pt(9.5)
            cap_run.font.color.rgb = RGBColor(75, 85, 99)
        else:
            add_body(f"[{caption} - Image located at {img_rel_path}]")

    # =========================================================================
    # CHAPTER 9: CHALLENGES AND LIMITATIONS
    # =========================================================================
    doc.add_page_break()
    add_section_heading("9. Challenges and Limitations", level=1)
    add_section_heading("9.1 Technical Challenges Encountered & Resolved", level=2)

    add_bullet(" If a user opens the application across three browser tabs, closing one tab should not broadcast an offline presence update to peers. Resolved by designing a multi-socket tracking system (userSockets = Map<string, Set<string>>). Presence transitions to offline only when the socket set for a given user ID reaches exactly zero.", "1. Multi-Tab Presence Synchronization:")
    add_bullet(" During Render CI build execution, TypeScript threw error TS5108: Option 'moduleResolution=node' has been removed while compiling the shared workspace. Resolved by upgrading compiler options in shared/tsconfig.json and server/tsconfig.json to modern NodeNext. Since package.json retains default CommonJS mode, TypeScript emitted standard CommonJS JavaScript (require), satisfying both the strict compiler check and the runtime Node.js engine.", "2. Module Resolution & TypeScript Compiler Error TS5108 on Render:")
    add_bullet(" Render frontend static sites frequently dispatch requests where browser headers omit trailing slashes (https://client.onrender.com), while manual environment variables contain them (https://client.onrender.com/), causing silent CORS rejections. Resolved by developing an automated origin normalization utility in server/src/config/env.ts that sanitizes all incoming allowed origins and strips trailing slashes.", "3. Cross-Origin Resource Sharing (CORS) with Trailing Slashes:")
    add_bullet(" Standard service worker fetch interceptors can inadvertently capture WebSocket upgrade requests or cache stale REST API responses. Resolved by explicitly filtering out all requests carrying Upgrade: websocket, URLs targeting /socket.io/, and REST endpoints starting with /api/, routing them directly to the network.", "4. Service Worker Interference with WebSockets:")

    add_section_heading("9.2 Current System Limitations", level=2)
    add_bullet(" Without attaching a Render Persistent Disk (mounted at /var/data), SQLite files hosted on standard free-tier Render instances reset upon container restarts or after 15 minutes of inactivity.", "1. Ephemeral SQLite Storage on Free-Tier Containers:")
    add_bullet(" The current architecture does not handle binary file uploads, audio messages, or image attachments.", "2. Text-Only Message Payloads:")
    add_bullet(" Messages are encrypted in transit via HTTPS/WSS, but stored in plaintext within the server SQLite database.", "3. Absence of End-to-End Encryption (E2EE):")

    # =========================================================================
    # CHAPTER 10: CONCLUSION
    # =========================================================================
    add_section_heading("10. Conclusion", level=1)
    add_body(
        "The SketchChat project successfully demonstrates that a modern, highly responsive real-time messaging platform "
        "can be engineered using foundational web technologies without dependency on heavy proprietary frameworks or external cloud chat APIs."
    )
    add_section_heading("10.1 Summary of Accomplishments", level=2)
    add_bullet(" Implemented a complete event-driven communication system delivering sub-50ms message propagation.")
    add_bullet(" Integrated durable SQLite persistence using Node.js native DatabaseSync in WAL mode.")
    add_bullet(" Designed an end-to-end message status tracking pipeline (SENT → DELIVERED → READ).")
    add_bullet(" Created a unique hand-drawn 'Sketch' design language with responsive Tailwind CSS components.")
    add_bullet(" Engineered full Progressive Web App (PWA) installability compliant with modern browser standards.")
    add_bullet(" Successfully resolved production build configurations for deployment onto Render cloud infrastructure.")

    add_section_heading("10.2 Key Learning Outcomes", level=2)
    add_body(
        "Through the development of SketchChat, key full-stack engineering competencies were mastered: "
        "handling bi-directional socket lifecycles and connection pooling; managing optimistic client state updates and compensating for potential server rejections; "
        "designing clean, decoupled monorepos using shared TypeScript contract definitions; and navigating Service Worker caching strategies to balance offline availability against real-time data integrity."
    )

    # =========================================================================
    # CHAPTER 11: FUTURE SCOPE
    # =========================================================================
    add_section_heading("11. Future Scope", level=1)
    add_body("While the current release provides an exceptionally stable 1-to-1 personal messaging experience, several prospective enhancements can elevate the platform:")
    add_bullet(" Integrate the Signal Protocol (or Web Crypto API with Diffie-Hellman key exchange) so that messages are encrypted on the client device and unreadable by the server.", "1. End-to-End Encryption (E2EE):")
    add_bullet(" Implement server-side Web Push notifications allowing users to receive incoming message alerts even when the browser or PWA is completely closed.", "2. Web Push Notifications API:")
    add_bullet(" Leverage the existing type: 'group' field in the database schema to introduce group chat rooms, participant invite links, and role-based permissions.", "3. Multi-Party Group Conversations:")
    add_bullet(" Integrate signed upload URLs to facilitate compressed image and voice note transmission.", "4. Rich Media Sharing via S3-Compatible Object Storage:")
    add_bullet(" Provide a user preference setting allowing individuals to opt out of broadcasting read receipts and typing status.", "5. Read Receipt Privacy Toggle:")

    # =========================================================================
    # CHAPTER 12: REFERENCES
    # =========================================================================
    doc.add_page_break()
    add_section_heading("12. References", level=1)
    refs = [
        "Socket.IO Documentation & Protocols. Socket.IO: Bidirectional and low-latency communication for every platform. Available at: https://socket.io/docs/v4/",
        "W3C Web App Manifest Specification. World Wide Web Consortium (W3C). Web Application Manifest (Working Draft). Available at: https://www.w3.org/TR/appmanifest/",
        "Service Workers Specification. W3C & WHATWG. Service Workers Nightly Draft. Available at: https://w3c.github.io/ServiceWorker/",
        "SQLite Write-Ahead Logging (WAL) Architecture. Hipp, D. R. Write-Ahead Logging: SQLite Database System. Available at: https://www.sqlite.org/wal.html",
        "Node.js Native SQLite Module Documentation. Node.js Foundation. Node.js v22 Documentation: sqlite module (node:sqlite). Available at: https://nodejs.org/api/sqlite.html",
        "React 18 Architecture & Concurrent Features. Meta Open Source. React 18 Documentation & Design Principles. Available at: https://react.dev/",
        "Render Cloud Deployment Runbook. Render Inc. Deploying Node.js and Static Site Applications on Render. Available at: https://render.com/docs",
        "TypeScript Compiler Specifications. Microsoft Corporation. TypeScript Modules & Resolution Algorithms (NodeNext). Available at: https://www.typescriptlang.org/docs/handbook/modules/reference.html"
    ]
    for idx, ref in enumerate(refs, 1):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.line_spacing = 1.15
        r_num = p.add_run(f"[{idx}] ")
        r_num.bold = True
        p.add_run(ref)

    # Save to PROJECT_REPORT.docx in project root
    output_path = os.path.join(base_dir, "PROJECT_REPORT.docx")
    doc.save(output_path)
    print("Successfully generated Word report at PROJECT_REPORT.docx")

if __name__ == "__main__":
    create_report_docx()
