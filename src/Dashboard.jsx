import { useState, useRef, useEffect } from 'react';
import { CardBody, InlineCardCreator, getCompatibleFormats } from './Cards.jsx';

const FMT_ICONS = { chart:'bar_chart', stat:'speed', article:'article', table:'table_chart', map:'map', interactive:'touch_app', feed:'rss_feed', media:'image', custom:'code_blocks' };

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
function CardWrapper({ card, group, groups, handlers, isEditing, editPromptValue, setEditPromptValue, isDragging }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const fmts = getCompatibleFormats(card);
  const color = group?.color || '#6366f1';
  const accent = card.renderSpec?.color || color;
  const accentBg = accent + '22';

  return (
    <div
      className="card-wrapper"
      style={{ '--cols': card.cols, '--rows': card.rows }}
      draggable={!isEditing}
      onDragStart={e => handlers.onDragStart(e, card.id)}
      onDragOver={e => handlers.onDragOver(e, card.id)}
      onDragEnd={handlers.onDragEnd}
    >
      <div className={`card-inner${isDragging ? ' dragging' : ''}${isEditing ? ' is-editing' : ''}`}>

        {/* ── FRONT FACE ── */}
        <div className="card-face-front">
          <div className="card-top-accent" style={{ background: `linear-gradient(90deg, ${color}, ${color}55)` }} />

          <div className="card-hd">
            <div className="card-type-ico" style={{ background: accentBg }}>
              <span className="material-symbols-outlined" style={{ color: accent }}>
                {card.isCreating ? 'edit_note' : (FMT_ICONS[card.cardType] || 'dashboard')}
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

            {!card.isCreating && !card.loading && !card.error && (
              <>
                <select className="group-sel" value={card.group} onChange={e => handlers.onMove(card.id, e.target.value)} title="Move to group">
                  {groups.map(g => <option key={g.name} value={g.name}>📁 {g.name}</option>)}
                </select>
                <div className="fmt-sw">
                  {fmts.map(fmt => (
                    <button key={fmt} className={`fmt-btn${card.cardType === fmt ? ' active' : ''}`} title={`View as ${fmt}`} onClick={() => handlers.onOverride(card.id, fmt)}>
                      <span className="material-symbols-outlined">{FMT_ICONS[fmt] || 'dashboard'}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {!card.isCreating && (
              <div className="card-menu-wrap" ref={menuRef}>
                <button className="card-menu-btn" onClick={() => setMenuOpen(o => !o)}>
                  <span className="material-symbols-outlined">more_horiz</span>
                </button>
                {menuOpen && (
                  <div className="card-dropdown">
                    <div className="dd-item" onClick={() => { handlers.onRefresh(card.id); setMenuOpen(false); }}>
                      <span className="material-symbols-outlined">refresh</span> Refresh
                    </div>
                    <div className="dd-item" onClick={() => { handlers.onStartEdit(card); setMenuOpen(false); }}>
                      <span className="material-symbols-outlined">edit</span> Edit Prompt
                    </div>
                    <div className="dd-sep" />
                    <div className="dd-item danger" onClick={() => { handlers.onDelete(card.id); setMenuOpen(false); }}>
                      <span className="material-symbols-outlined">delete</span> Delete Card
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card-bd">
            {card.isCreating
              ? <InlineCardCreator card={card} onGenerate={handlers.onGenerate} onCancel={handlers.onCancel} />
              : <CardBody card={card} handlers={handlers} />
            }
          </div>

          {!card.isCreating && (
            <div className="card-ft" onClick={() => handlers.onStartEdit(card)}>
              <span className="material-symbols-outlined" style={{ fontSize:11, color:'var(--fg-dim)', flexShrink:0 }}>edit</span>
              <span className="prompt-echo" title={card.prompt}>"{card.prompt}"</span>
              <div className="card-badges">
                <span className="badge">{card.cardType}</span>
                <span className="badge">{card.size}</span>
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
                <span className="badge">{card.cardType}</span>
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
  const groupCards = cards.filter(c => c.group === group.name);

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
        <div className="cards-grid" style={{ gridAutoFlow: workflowConfig.densePacking ? 'dense' : 'row' }}>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── DASHBOARD VIEW ─── */
export function DashboardView({ cards, groups, setGroups, isApiConnected, workflowConfig, consolePrompt, setConsolePrompt, isConsoleSubmitting, onAddCard, editingCardId, editPromptValue, setEditPromptValue, draggingCardId, handlers, samplePrompts }) {
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

      <div className="main-content fade-in">
        {!isApiConnected && (
          <div className="demo-banner">
            <span className="material-symbols-outlined">info</span>
            <div>
              <div className="demo-banner-title">Demo Mode — No API Key Configured</div>
              <div className="demo-banner-desc">Open Settings to connect OpenRouter, OpenAI, or OpenCode Go for live AI-powered card generation.</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handlers.onOpenSettings} style={{ flexShrink:0 }}>
              <span className="material-symbols-outlined">settings</span>
              <span className="prompt-btn-label"> Setup</span>
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
