import { useState, useRef, useEffect } from 'react';
import { CardBody, InlineCardCreator } from './Cards.jsx';

/* ─── PROMPT CONSOLE ─── */
function PromptConsole({ consolePrompt, setConsolePrompt, onAddCard, isSubmitting, workflowConfig, samplePrompts }) {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  return (
    <div className="prompt-wrap">
      <div className="prompt-bar">
        <span className="material-symbols-outlined pi">auto_awesome</span>
        <input
          ref={inputRef}
          className="prompt-input"
          placeholder="Ask your dashboard anything…"
          value={consolePrompt}
          onChange={e => setConsolePrompt(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onAddCard(consolePrompt); } }}
          disabled={isSubmitting}
        />
        <button className="btn btn-primary prompt-btn" disabled={isSubmitting} onClick={() => onAddCard(consolePrompt)}>
          {isSubmitting
            ? <><span className="material-symbols-outlined spinning">psychology</span><span className="prompt-btn-label"> Analyzing…</span></>
            : <><span className="material-symbols-outlined">add_circle</span><span className="prompt-btn-label"> Generate</span></>}
        </button>
      </div>
      {(focused || consolePrompt) && workflowConfig.enableAutocomplete && samplePrompts.length > 0 && (
        <div className="preset-row">
          {samplePrompts.map((p, i) => (
            <button key={i} className="preset-chip" onMouseDown={() => { setConsolePrompt(p.text); inputRef.current?.focus(); }}>
              <span className="material-symbols-outlined">{p.icon}</span>
              <span className="preset-chip-text">{p.text}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── CARD WRAPPER ─── */
function CardWrapper({ card, group, groups, handlers, isEditing, editPromptValue, setEditPromptValue, isDragging, workflowConfig }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const bodyRef = useRef(null);
  const [autoRows, setAutoRows] = useState(card.rows);

  useEffect(() => {
    if (!menuOpen) return;
    const close = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  // Content-driven sizing: continuously fit the card to its rendered content via
  // ResizeObserver + MutationObserver (catches async/live data, fonts, images).
  // Resets to the model's rows whenever the code or data changes — so a card that
  // had more data and now has less doesn't stay permanently oversized. Grows from
  // the model's rows up to the cap; respects a manual size lock.
  useEffect(() => {
    setAutoRows(card.rows);
    if (!workflowConfig?.autoFitHeight || card.sizeLocked || card.isCreating || card.loading || card.error || isEditing) return;
    const ROW = 82, MAX = 8;
    let frame;
    // Grow only to eliminate real overflow. This converges (each grow shrinks the
    // overflow to zero) and leaves height-filling components alone (they never
    // overflow), avoiding the runaway-growth problem of measuring raw scrollHeight.
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const content = bodyRef.current?.querySelector('.card-bd')?.firstElementChild;
        if (!content) return;
        const overflow = content.scrollHeight - content.clientHeight;
        if (overflow > 6) {
          const extra = Math.ceil(overflow / ROW);
          setAutoRows(prev => Math.min(MAX, prev + extra));
        }
      });
    };
    const target = bodyRef.current?.querySelector('.card-bd');
    if (!target) return;
    const ro = new ResizeObserver(measure);
    const mo = new MutationObserver(measure);
    ro.observe(target);
    if (target.firstElementChild) ro.observe(target.firstElementChild);
    mo.observe(target, { childList: true, subtree: true, characterData: true });
    measure();
    const t = setTimeout(measure, 600);
    return () => { cancelAnimationFrame(frame); ro.disconnect(); mo.disconnect(); clearTimeout(t); };
  }, [card.rows, card.renderCode, card.lastFetched, card.loading, card.error, card.isCreating, card.sizeLocked, isEditing, workflowConfig?.autoFitHeight]);

  const color = group?.color || '#6366f1';
  const accent = card.renderSpec?.color || color;
  const accentBg = accent + '22';

  // Agent-controlled chrome. During loading/error/creating we force full chrome so
  // status is always visible; a finished card honors its chosen mode.
  const transient = card.isCreating || card.loading || card.error;
  const chromeMode = transient ? 'full' : (card.chrome || 'full');
  const showHeader = chromeMode === 'full' || chromeMode === 'minimal';
  const showFooter = chromeMode === 'full' && !card.isCreating;
  const showAccent = chromeMode === 'full';
  const bleed = !!card.bleed && !transient;

  const menuEl = !card.isCreating && (
    <div className="card-menu-wrap" ref={menuRef}>
      <button className="card-menu-btn" onClick={() => setMenuOpen(o => !o)}>
        <span className="material-symbols-outlined">more_horiz</span>
      </button>
      {menuOpen && (
        <div className="card-dropdown">
          {card.dataBindings?.length > 0 && (
            <div className="dd-item" onClick={() => { handlers.onRefresh(card.id); setMenuOpen(false); }}>
              <span className="material-symbols-outlined">refresh</span> Refresh data
            </div>
          )}
          <div className="dd-item" onClick={() => { handlers.onRegenerate(card.id); setMenuOpen(false); }}>
            <span className="material-symbols-outlined">autorenew</span> Regenerate
          </div>
          <div className="dd-item" onClick={() => { handlers.onDuplicate(card.id); setMenuOpen(false); }}>
            <span className="material-symbols-outlined">content_copy</span> Duplicate
          </div>
          <div className="dd-item" onClick={() => { handlers.onStartEdit(card); setMenuOpen(false); }}>
            <span className="material-symbols-outlined">edit</span> Edit Prompt
          </div>
          <div className="dd-item" onClick={() => { handlers.onSaveTemplate(card.id); setMenuOpen(false); }}>
            <span className="material-symbols-outlined">bookmark_add</span> Save as Template
          </div>
          {card.sizeLocked
            ? <div className="dd-item" onClick={() => { handlers.onToggleSizeLock(card.id); setMenuOpen(false); }}><span className="material-symbols-outlined">aspect_ratio</span> Auto-size</div>
            : null}
          <div className="dd-sep" />
          <div className="dd-item danger" onClick={() => { handlers.onDelete(card.id); setMenuOpen(false); }}>
            <span className="material-symbols-outlined">delete</span> Delete Card
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div
      ref={bodyRef}
      className="card-wrapper"
      style={{ '--cols': card.cols, '--rows': autoRows }}
      draggable={!isEditing}
      onDragStart={e => handlers.onDragStart(e, card.id)}
      onDragOver={e => handlers.onDragOver(e, card.id)}
      onDragEnd={handlers.onDragEnd}
    >
      <div className={`card-inner${isDragging ? ' dragging' : ''}${isEditing ? ' is-editing' : ''}`}>

        {/* ── FRONT FACE ── */}
        <div className="card-face-front">
          {showAccent && <div className="card-top-accent" style={{ background: `linear-gradient(90deg, ${color}, ${color}55)` }} />}

          {showHeader ? (
            <div className="card-hd">
              <div className="card-type-ico" style={{ background: accentBg }}>
                <span className="material-symbols-outlined" style={{ color: accent }}>
                  {card.isCreating ? 'edit_note' : (card.renderCode ? 'code_blocks' : 'dashboard')}
                </span>
              </div>
              <div className="card-meta">
                <div className="card-title">{card.isCreating ? 'New Card' : card.title}</div>
                <div className="card-sub">
                  {card.isCreating ? 'Describe what to display' :
                   card.loading ? 'Analyzing intent…' :
                   `${card.dataSource || ''}${card.lastFetched ? ` · ${new Date(card.lastFetched).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}` : ''}`}
                </div>
              </div>

              {chromeMode === 'full' && !card.isCreating && !card.loading && !card.error && (
                <select className="group-sel" value={card.group} onChange={e => handlers.onMove(card.id, e.target.value)} title="Move to group">
                  {groups.map(g => <option key={g.name} value={g.name}>📁 {g.name}</option>)}
                </select>
              )}

              {menuEl}
            </div>
          ) : (
            <div className="card-float-menu">{menuEl}</div>
          )}

          <div className={`card-bd${bleed ? ' card-bd--bleed' : ''}`}>
            {card.isCreating
              ? <InlineCardCreator card={card} onGenerate={handlers.onGenerate} onCancel={handlers.onCancel} />
              : <CardBody card={card} onRetry={() => handlers.onRegenerate(card.id)} onRepair={(msg) => handlers.onRepair(card.id, msg)} onPersistState={handlers.onPersistState} />
            }
          </div>

          {showFooter && (
            <div className="card-ft" onClick={() => handlers.onStartEdit(card)}>
              <span className="material-symbols-outlined" style={{ fontSize:11, color:'var(--fg-dim)', flexShrink:0 }}>edit</span>
              <span className="prompt-echo" title={card.prompt}>"{card.prompt}"</span>
              <div className="card-badges">
                {card.renderCode && <span className="badge">ai</span>}
                <span className="badge">{card.cols}×{card.rows}</span>
                {card.refreshInterval > 0 && <span className="badge live">live</span>}
              </div>
            </div>
          )}
        </div>

        {/* ── BACK FACE (edit mode) — flips in over the front ── */}
        {isEditing && (
          <div className="card-face-back" onClick={e => e.stopPropagation()}>
            <div className="cfb-top-accent" style={{ background: `linear-gradient(90deg, ${color}, ${color}55)` }} />
            <div className="cfb-header">
              <div className="card-type-ico" style={{ background: accentBg }}>
                <span className="material-symbols-outlined" style={{ color: accent }}>edit</span>
              </div>
              <div className="card-meta">
                <div className="card-title">Edit Card</div>
                <div className="card-sub">{card.title}</div>
              </div>
              <button className="icon-btn cfb-close" onClick={handlers.onCancelEdit}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="cfb-body">
              <div className="cfb-label">PROMPT</div>
              <textarea
                className="cfb-textarea"
                value={editPromptValue}
                onChange={e => setEditPromptValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlers.onSaveEdit(card.id);
                  if (e.key === 'Escape') handlers.onCancelEdit();
                }}
                autoFocus
                placeholder="Describe what this card should display…"
              />
              <div className="cfb-hint">
                <span className="material-symbols-outlined" style={{ fontSize:11 }}>info</span>
                ⌘/Ctrl+Enter to regenerate · Esc to cancel
              </div>
            </div>

            <div className="cfb-footer">
              <div className="card-badges">
                {card.renderCode && <span className="badge">ai</span>}
                <span className="badge">{card.size}</span>
                {card.refreshInterval > 0 && <span className="badge live">live</span>}
              </div>
              <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                <button className="btn btn-secondary btn-sm" onClick={handlers.onCancelEdit}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={() => handlers.onSaveEdit(card.id)}>
                  <span className="material-symbols-outlined">auto_awesome</span> Regenerate
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card-resize" onMouseDown={e => handlers.onResizeMouseDown(e, card.id)} />
    </div>
  );
}

/* ─── GROUP SECTION ─── */
function GroupSection({ group, cards, groups, handlers, editingCardId, editPromptValue, setEditPromptValue, draggingCardId, workflowConfig, setGroups }) {
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(group.name);
  const sortOrder = workflowConfig?.defaultSortOrder || 'none';
  const groupCards = cards.filter(c => c.group === group.name);
  if (sortOrder !== 'none') {
    const area = c => (c.cols || 6) * (c.rows || 2);
    groupCards.sort((a, b) => sortOrder === 'size-desc' ? area(b) - area(a) : area(a) - area(b));
  }

  const saveName = () => {
    const val = nameVal.trim();
    if (!val || val === group.name) { setEditingName(false); setNameVal(group.name); return; }
    handlers.onSaveGroupName(group.name, val);
    setEditingName(false);
  };

  return (
    <div
      className="group-section"
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'); if (id) handlers.onMove(id, group.name); }}
    >
      <div className="group-header">
        <div className="group-color-dot" style={{ background: group.color }} />
        {editingName ? (
          <input
            className="group-name-input"
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onBlur={saveName}
            onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setEditingName(false); setNameVal(group.name); } }}
            autoFocus
          />
        ) : (
          <span className="group-name" onDoubleClick={() => { setEditingName(true); setNameVal(group.name); }} title="Double-click to rename">
            {group.name}
          </span>
        )}
        <span className="group-count">{groupCards.length}</span>

        <div className="group-acts">
          <button className="group-btn" onClick={() => handlers.onAddPlaceholder(group.name)}>
            <span className="material-symbols-outlined">add</span>
            <span className="group-btn-label"> Add Card</span>
          </button>
          {groupCards.length === 0 && (
            <button className="group-btn danger" onClick={() => setGroups(prev => prev.filter(g => g.name !== group.name))}>
              <span className="material-symbols-outlined">delete</span>
            </button>
          )}
          <button className={`collapse-btn${group.collapsed ? ' collapsed' : ''}`} onClick={() => handlers.onToggleGroup(group.name)}>
            <span className="material-symbols-outlined">keyboard_arrow_down</span>
          </button>
        </div>
      </div>

      {!group.collapsed && (
        <div className="cards-grid" style={{ gridAutoFlow: workflowConfig.densePacking ? 'dense' : 'row', '--card-gap': `${workflowConfig.gridSnapUnit || 8}px` }}>
          {groupCards.length === 0 && (
            <div className="group-empty">
              <span className="material-symbols-outlined" style={{ fontSize:18 }}>dashboard_customize</span>
              Drag cards here or click "Add Card"
            </div>
          )}
          {groupCards.map(card => (
            <CardWrapper
              key={card.id}
              card={card}
              group={group}
              groups={groups}
              handlers={handlers}
              isEditing={editingCardId === card.id}
              editPromptValue={editPromptValue}
              setEditPromptValue={setEditPromptValue}
              isDragging={draggingCardId === card.id}
              workflowConfig={workflowConfig}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── DASHBOARD VIEW ─── */
export function DashboardView({ cards, groups, setGroups, isApiConnected, workflowConfig, consolePrompt, setConsolePrompt, isConsoleSubmitting, onAddCard, editingCardId, editPromptValue, setEditPromptValue, draggingCardId, handlers, samplePrompts, templates = [], onUseTemplate, onDeleteTemplate, onExport, onImport }) {
  const totalCards = cards.length;
  const fileRef = useRef(null);
  const firstGroup = groups[0]?.name || 'Personal';

  return (
    <div>
      <PromptConsole
        consolePrompt={consolePrompt}
        setConsolePrompt={setConsolePrompt}
        onAddCard={onAddCard}
        isSubmitting={isConsoleSubmitting}
        workflowConfig={workflowConfig}
        samplePrompts={samplePrompts}
      />

      <div className="dash-toolbar">
        <div className="dash-tpl-row">
          {templates.length > 0 && <span className="dash-tpl-label">TEMPLATES</span>}
          {templates.map(t => (
            <span key={t.id} className="tpl-chip">
              <button className="tpl-chip-use" onClick={() => onUseTemplate(t.id, firstGroup)} title="Add this template to your dashboard">
                <span className="material-symbols-outlined">bookmark</span> {t.name}
              </button>
              <button className="tpl-chip-del" onClick={() => onDeleteTemplate(t.id)} title="Delete template">×</button>
            </span>
          ))}
        </div>
        <div className="dash-io-row">
          <button className="btn btn-secondary btn-sm" onClick={onExport} title="Export dashboard as JSON">
            <span className="material-symbols-outlined">download</span><span className="prompt-btn-label"> Export</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} title="Import a dashboard JSON">
            <span className="material-symbols-outlined">upload</span><span className="prompt-btn-label"> Import</span>
          </button>
          <input ref={fileRef} type="file" accept="application/json" style={{ display:'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value=''; }} />
        </div>
      </div>

      <div className="main-content fade-in">
        {!isApiConnected && (
          <div className="onboarding-cta">
            <div className="onboarding-icon">
              <span className="material-symbols-outlined">auto_awesome</span>
            </div>
            <div className="onboarding-body">
              <div className="onboarding-title">Connect an AI Provider to Get Started</div>
              <div className="onboarding-desc">
                Agntdash uses a 3-stage pipeline: an intent analyzer decides if live search is needed, Tavily fetches real data, then a smart model writes a custom React component for each card. No simulated responses — every card is generated live.
              </div>
            </div>
            <button className="btn btn-primary" onClick={handlers.onOpenSettings} style={{ flexShrink:0 }}>
              <span className="material-symbols-outlined">settings</span>
              <span className="prompt-btn-label"> Open Settings</span>
            </button>
          </div>
        )}

        {groups.map(group => (
          <GroupSection
            key={group.name}
            group={group}
            cards={cards}
            groups={groups}
            setGroups={setGroups}
            handlers={handlers}
            editingCardId={editingCardId}
            editPromptValue={editPromptValue}
            setEditPromptValue={setEditPromptValue}
            draggingCardId={draggingCardId}
            workflowConfig={workflowConfig}
          />
        ))}

        {isApiConnected && totalCards === 0 && (
          <div className="empty-dashboard">
            <span className="material-symbols-outlined" style={{ fontSize:40, color:'var(--fg-dim)', marginBottom:12 }}>dashboard_customize</span>
            <div style={{ fontSize:14, fontWeight:600, color:'var(--fg-muted)', marginBottom:6 }}>Your dashboard is empty</div>
            <div style={{ fontSize:12, color:'var(--fg-dim)' }}>Type a prompt above to generate your first card</div>
          </div>
        )}

        <div className="add-group-row">
          <button className="btn btn-secondary" onClick={handlers.onAddGroup}>
            <span className="material-symbols-outlined">create_new_folder</span>
            <span className="prompt-btn-label"> New Group</span>
          </button>
        </div>
      </div>
    </div>
  );
}
