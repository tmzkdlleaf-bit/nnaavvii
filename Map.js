/* ================================================================= */
/*  Map.js — 전체 인물 관계도 기능 파일                                */
/*  초보자 안내: 이 파일은 캐릭터들끼리 선으로 연결된 '관계도' 화면을      */
/*  그려주고, 마우스로 클릭해서 이리저리 끌고 다닐 수 있게 만들어줍니다.   */
/* ================================================================= */

// ─────────────────────────────────────────────────────────────────
// 1. 관계도 기본 상태 및 환경 설정
// ─────────────────────────────────────────────────────────────────
// 컴퓨터가 관계도를 그릴 때 기억해두는 메모장(상태 변수)들입니다.
let staticMapData    = { nodes: {}, edges: [], customNodes: [], customGroups: {} }; // 점(캐릭터)과 선(관계) 데이터
let isMapEditMode    = false; // 현재 편집(수정) 모드가 켜져 있는지 꺼져 있는지 기억합니다.
let currentMapPhase  = 0;     // 현재 보고 있는 관계도가 몇 부(1부~4부)인지 기억합니다.

// 캐릭터들이 소속된 진영(그룹)별로 뒤에 깔릴 네모난 배경 색상을 정해줍니다.
const defaultGroupConfig = {
    '★캐릭터파': { color: 'rgba(215, 179, 61, 0.05)',  border: '#d7b33d', name: '★캐릭터파' },  // 금색빛
    '마바사파': { color: 'rgba(76, 175, 80, 0.05)',   border: '#4caf50', name: '마바사파' }   // 초록빛
};

// 기본 캐릭터 데이터에 우리가 새로 추가한 가짜(커스텀) 캐릭터들을 하나로 합쳐주는 도우미 함수입니다.
function getMergedCharData()    { return [...charData, ...(staticMapData.customNodes || [])]; }

// 기본 진영 설정에 우리가 새로 추가한 가짜(커스텀) 진영들을 하나로 합쳐주는 도우미 함수입니다.
function getMergedGroupConfig() { return { ...defaultGroupConfig, ...(staticMapData.customGroups || {}) }; }

// 데이터베이스에 저장된 관계도가 없을 때, 화면에 임시로 띄워줄 기본(더미) 관계도 배치도입니다.
function getInitialMapData() {
    return {
        // 점(캐릭터)들의 x, y 좌표 (퍼센트 단위입니다. x: 50, y: 50 이면 정중앙)
        nodes: {
            'ho1': { x: 50, y: 50 }, 'ho2': { x: 20, y: 50 },
            'ho3': { x: 35, y: 80 }, 'ho4': { x: 65, y: 80 }
        },
        // 선(관계)들을 어떻게 이을지 설정합니다. (from: 출발점, to: 도착점)
        edges: [
            { from: 'ho1', to: 'ho2', text: '더미 관계 1', color: '#ff4d4d', isDashed: false, pos: 0.5 },
            { from: 'ho3', to: 'ho4', text: '더미 관계 2', color: '#d7b33d', isDashed: true,  pos: 0.5 }
        ],
        customNodes: [],
        customGroups: {}
    };
}


// ─────────────────────────────────────────────────────────────────
// 2. 데이터 불러오기 및 화면에 그리기
// ─────────────────────────────────────────────────────────────────
// 데이터베이스에서 저장된 관계도 위치를 가져와서 화면에 그릴 준비를 하는 함수입니다.
async function loadAndDrawMap() {
    if (!supabaseClient) { staticMapData = getInitialMapData(); renderStaticMap(); return; }
    try {
        // 서버에서 'global_static_map' 이라는 이름으로 저장된 관계도 위치표를 찾습니다.
        const { data } = await supabaseClient
            .from('character_profiles').select('relationships')
            .eq('char_id', 'global_static_map').eq('phase', currentMapPhase).single();
            
        // 찾았으면 그 정보를 쓰고, 없으면 방금 위에서 만든 기본(더미) 배치도를 씁니다.
        staticMapData = (data && data.relationships)
            ? JSON.parse(data.relationships)
            : getInitialMapData();
    } catch (e) {
        staticMapData = getInitialMapData(); // 에러가 나도 화면이 깨지지 않게 기본값을 넣습니다.
    }

    // 빈 배열이나 객체가 없으면 새로 만들어줍니다. (에러 방지용)
    if (!staticMapData.customNodes)  staticMapData.customNodes  = [];
    if (!staticMapData.customGroups) staticMapData.customGroups = {};
    staticMapData.edges.forEach(e => { if (e.pos === undefined) e.pos = 0.5; });
    
    // 캐릭터 목록에는 있는데 좌표가 없는 캐릭터는 무조건 화면 정중앙(50, 50)에 소환합니다.
    getMergedCharData().forEach(c => { if (!staticMapData.nodes[c.id]) staticMapData.nodes[c.id] = { x: 50, y: 50 }; });
    
    renderStaticMap(); // 준비된 데이터를 바탕으로 실제로 화면에 그림을 그립니다.
}

// ─────────────────────────────────────────────────────────────────
// 3. 진영(그룹) 배경 그리기
// ─────────────────────────────────────────────────────────────────
// 같은 진영(★캐릭터파, 마바사파 등)에 속한 사람들을 묶어서 커다란 색깔 네모 상자로 감싸주는 함수입니다.
function renderGroups() {
    const layer = document.getElementById('faction-groups-layer');
    if (!layer) return;
    let html = '';
    const currentGroups = getMergedGroupConfig();
    const currentChars  = getMergedCharData();

    // 진영별로 캐릭터들의 위치를 파악해서 가장 큰 네모를 그립니다.
    for (const [gTitle, config] of Object.entries(currentGroups)) {
        const members = currentChars.filter(c => c.title === gTitle);
        if (members.length === 0) continue; // 아무도 없는 진영은 넘어갑니다.
        
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, hasNode = false;
        
        // 이 진영 사람들의 좌표를 모두 조사해서 가장 왼쪽, 오른쪽, 위, 아래 끝부분을 찾습니다.
        members.forEach(m => {
            const pos = staticMapData.nodes[m.id];
            if (!pos) return;
            minX = Math.min(minX, pos.x); maxX = Math.max(maxX, pos.x);
            minY = Math.min(minY, pos.y); maxY = Math.max(maxY, pos.y);
            hasNode = true;
        });
        if (!hasNode) continue;
        
        const pad = 70; // 네모 상자가 사람 얼굴에 딱 붙지 않게 70픽셀 정도 여유를 줍니다.
        
        // 찾아낸 끝부분을 바탕으로 배경 네모 상자 HTML을 만듭니다.
        html += `
            <div class="faction-group"
                style="left:calc(${minX}% - ${pad}px); top:calc(${minY}% - ${pad}px);
                       width:calc(${maxX - minX}% + ${pad * 2}px); height:calc(${maxY - minY}% + ${pad * 2}px);
                       background-color:${config.color}; border:2px dashed ${config.border};">
                <span class="faction-name" style="color:${config.border}; border-color:${config.border};">${config.name}</span>
            </div>`;
    }
    layer.innerHTML = html; // 완성된 네모 상자들을 화면에 깝니다.
}

// ─────────────────────────────────────────────────────────────────
// 4. 선(관계) 긋기 및 글씨 배지 위치 잡기
// ─────────────────────────────────────────────────────────────────
// 캐릭터(점)와 캐릭터(점) 사이를 선으로 쭉 이어주는 함수입니다.
function updateDynamicPositions() {
    const svg = document.getElementById('map-svg-layer'); // 선을 그리는 전용 도화지(SVG)입니다.
    if (!svg) return;
    let svgHTML = '';

    // 설정된 모든 선(edge) 데이터를 돌면서 하나씩 긋습니다.
    staticMapData.edges.forEach((edge, idx) => {
        const n1 = staticMapData.nodes[edge.from];
        const n2 = staticMapData.nodes[edge.to];
        if (!n1 || !n2) return;

        // 점선 설정이 되어있으면 선을 띄엄띄엄 그립니다.
        const dash = edge.isDashed ? 'stroke-dasharray="8, 6"' : '';
        svgHTML   += `<line x1="${n1.x}%" y1="${n1.y}%" x2="${n2.x}%" y2="${n2.y}%" stroke="${edge.color}" stroke-width="3" ${dash} opacity="0.8" />`;

        // 선 가운데에 '연인', '원수' 같은 글씨(배지)를 다는 작업입니다.
        const badgeEl = document.querySelector(`.rel-label[data-idx="${idx}"]`);
        if (!badgeEl) return;
        
        // 배지가 선의 어느 위치(비율)에 있을지 계산합니다. (pos가 0.5면 정중앙)
        const p  = edge.pos || 0.5;
        const bx = n1.x + (n2.x - n1.x) * p;
        const by = n1.y + (n2.y - n1.y) * p;
        
        // 글씨가 선의 기울기에 맞춰서 비스듬하게 눕도록 각도를 계산하는 수학 공식입니다.
        const ratio = 10 / 16;
        const dx    = n2.x - n1.x;
        const dy    = (n2.y - n1.y) * ratio;
        let angle   = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angle > 90 || angle < -90) angle += 180; // 글씨가 뒤집히지 않게 똑바로 세워줍니다.
        
        badgeEl.style.left      = `${bx}%`;
        badgeEl.style.top       = `${by}%`;
        badgeEl.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`;
    });
    svg.innerHTML = svgHTML; // 도화지에 그린 선들을 화면에 반영합니다.
}

// ─────────────────────────────────────────────────────────────────
// 5. 관계도 화면 전체 새로고침
// ─────────────────────────────────────────────────────────────────
function renderStaticMap() {
    const nodesLayer = document.getElementById('static-nodes-layer');
    if (!nodesLayer) return;

    let html = '';
    const currentChars = getMergedCharData();

    // 캐릭터 얼굴(동그라미)들을 좌표 위치에 맞게 하나씩 찍어줍니다.
    currentChars.forEach(c => {
        const pos = staticMapData.nodes[c.id];
        if (!pos) return;
        // 내 캐릭터라면 노란색 테두리를 씌워서 알아보기 쉽게 만듭니다.
        const isMyNode = (currentUser && charOwners[currentUser.email] === `char-${c.id}`) ? 'my-node' : '';
        const profile  = allProfiles.find(p => p.char_id === `char-${c.id}` && p.phase === currentMapPhase);
        const imgSrc   = (profile && profile.profile_image) ? profile.profile_image : c.img;
        
        html += `
            <div class="map-node ${isMyNode}" data-id="${c.id}" id="map-node-${c.id}"
                style="left:${pos.x}%; top:${pos.y}%; transform:translate(-50%, -50%);">
                <img src="${imgSrc}">
                <span class="node-name">${c.name}</span>
            </div>`;
    });

    // 배지(관계 이름표) HTML 껍데기도 미리 만들어 둡니다. (위치는 updateDynamicPositions에서 잡음)
    staticMapData.edges.forEach((edge, idx) => {
        html += `<div class="rel-label" data-idx="${idx}" style="border-color:${edge.color}; color:${edge.color};">${edge.text}</div>`;
    });

    nodesLayer.innerHTML = html;
    
    // 얼굴들을 다 찍었으니 이제 그 사이를 선으로 잇고 배경을 칠합니다.
    updateDynamicPositions();
    renderGroups();
}


// ─────────────────────────────────────────────────────────────────
// 6. 마우스 드래그 & 드롭 (끌어다 놓기) 기능
// ─────────────────────────────────────────────────────────────────
// 마우스로 잡은 물체가 무엇인지 기억하는 변수들입니다.
let dragObj = null, dragStartX = 0, dragStartY = 0, isClickAction = false;

// 1. 마우스를 '누를 때' 발동하는 이벤트입니다.
document.addEventListener('mousedown', (e) => {
    const container = document.getElementById('static-map-container');
    if (!container || !container.contains(e.target)) return; // 관계도 바깥을 누르면 무시합니다.
    
    // 내가 마우스로 누른 게 얼굴(노드)인지, 관계 글씨(배지)인지 확인합니다.
    const node  = e.target.closest('.map-node');
    const badge = e.target.closest('.rel-label');
    
    if (node)       dragObj = { type: 'node',  id:  node.dataset.id, el: node };
    else if (badge) dragObj = { type: 'badge', idx: parseInt(badge.dataset.idx), el: badge };
    else            return; // 허공을 누른 거면 무시
    
    isClickAction = true; // 단순히 클릭인지, 드래그인지 구분하려고 현재 위치를 기록해둡니다.
    dragStartX = e.clientX; dragStartY = e.clientY;
});

// 2. 마우스를 누른 채로 '움직일 때' 발동하는 이벤트입니다.
document.addEventListener('mousemove', (e) => {
    if (!dragObj || !isMapEditMode) return; // 잡은 게 없거나 편집 모드가 아니면 무시합니다.
    
    // 마우스가 조금이라도 움직였으면 클릭이 아니라 드래그라고 판단합니다.
    if (Math.abs(e.clientX - dragStartX) > 3 || Math.abs(e.clientY - dragStartY) > 3) isClickAction = false;
    
    // 마우스 위치를 화면 비율(퍼센트)로 계산합니다.
    const rect     = document.getElementById('static-map-container').getBoundingClientRect();
    const xPercent = Math.max(0, Math.min(100, ((e.clientX - rect.left)  / rect.width)  * 100));
    const yPercent = Math.max(0, Math.min(100, ((e.clientY - rect.top)   / rect.height) * 100));

    // 잡은 게 얼굴(노드)이면 마우스 따라 위치를 옮기고, 선과 배경도 다시 그립니다.
    if (dragObj.type === 'node') {
        staticMapData.nodes[dragObj.id].x = xPercent;
        staticMapData.nodes[dragObj.id].y = yPercent;
        dragObj.el.style.left = `${xPercent}%`;
        dragObj.el.style.top  = `${yPercent}%`;
        updateDynamicPositions(); renderGroups();
    } 
    // 잡은 게 글씨(배지)면 선을 따라 좌우로만 미끄러지도록 움직입니다.
    else if (dragObj.type === 'badge') {
        const edge = staticMapData.edges[dragObj.idx];
        const n1   = staticMapData.nodes[edge.from];
        const n2   = staticMapData.nodes[edge.to];
        if (n1 && n2) {
            const dx = n2.x - n1.x, dy = n2.y - n1.y, lenSq = dx * dx + dy * dy;
            if (lenSq > 0)
                // 양 끝을 뚫고 나가지 못하게 0.15 ~ 0.85 비율 사이에서만 놀게 묶어둡니다.
                edge.pos = Math.max(0.15, Math.min(0.85, ((xPercent - n1.x) * dx + (yPercent - n1.y) * dy) / lenSq));
            updateDynamicPositions();
        }
    }
});

// 3. 마우스를 '뗄 때' 발동하는 이벤트입니다.
document.addEventListener('mouseup', (e) => {
    if (!dragObj) return;
    
    // 드래그가 아니라 단순히 콕 '클릭'만 한 거라면 설정된 팝업창을 엽니다.
    if (isClickAction) {
        if (isMapEditMode && dragObj.type === 'badge') openEdgeEditor(dragObj.idx); // 선 편집기 열기
        else if (isMapEditMode && dragObj.type === 'node') openNodeEditor(dragObj.id); // 인물 편집기 열기
        else if (!isMapEditMode && dragObj.type === 'node' && !dragObj.id.startsWith('custom_'))
            // 편집 모드가 아닐 때 진짜 캐릭터를 누르면, 그 캐릭터의 기본 정보 팝업창을 열어줍니다.
            openGeneralModal(`char-${dragObj.id}`, currentMapPhase);
    }
    dragObj = null; // 잡았던 물건을 놓아줍니다.
});


// ─────────────────────────────────────────────────────────────────
// 7. 편집 모드 켜기/끄기 기능
// ─────────────────────────────────────────────────────────────────
// 툴바의 '편집 모드 켜기' 버튼을 누를 때마다 실행되는 함수입니다.
window.toggleMapEdit = function () {
    isMapEditMode = !isMapEditMode; // 상태를 반대로 뒤집습니다 (켜짐 <-> 꺼짐)
    const btn        = document.getElementById('btn-toggle-edit');
    const btnAddEdge = document.getElementById('btn-add-edge');
    const btnAddNode = document.getElementById('btn-add-node');

    if (isMapEditMode) {
        document.body.classList.add('map-edit-mode'); // 마우스 커서를 바꾸기 위해 클래스를 붙입니다.
        btn.innerHTML        = "편집 모드 끄기 (저장필수)";
        btn.style.background = "#ff4d4d"; btn.style.borderColor = "#ff4d4d"; btn.style.color = "#fff"; // 붉은색 경고
        btnAddEdge.style.display = "inline-block"; // 새 선 만들기 버튼 보이기
        btnAddNode.style.display = "inline-block"; // 새 인물 만들기 버튼 보이기
    } else {
        document.body.classList.remove('map-edit-mode');
        btn.innerHTML        = "편집 모드 켜기";
        btn.style.background = "transparent"; btn.style.borderColor = "var(--accent-color)"; btn.style.color = "var(--accent-color)";
        btnAddEdge.style.display = "none";
        btnAddNode.style.display = "none";
        closeEdgeEditor(); // 혹시 열려있던 편집창이 있으면 닫습니다.
    }
};

// 1부, 2부 탭을 이동할 때 관계도 화면을 새로 그리는 함수입니다.
window.changeMapPhase = function (phase) {
    if (currentMapPhase === phase) return;
    currentMapPhase = phase;
    document.querySelectorAll('#map-phase-tabs .phase-btn').forEach((t, i) => t.classList.toggle('active', i === phase));
    loadAndDrawMap();
};


// ─────────────────────────────────────────────────────────────────
// 8. 관계선(Edge) 편집기 기능
// ─────────────────────────────────────────────────────────────────
// 선의 색깔, 점선 여부, 내용을 고치는 창을 엽니다.
window.openEdgeEditor = function (idx) {
    const panel   = document.getElementById('floating-edge-editor');
    const fromSel = document.getElementById('edge-from');
    const toSel   = document.getElementById('edge-to');
    
    // 누가 누구를 가리키는지 고를 수 있게 모든 인물 목록을 채워넣습니다.
    fromSel.innerHTML = ''; toSel.innerHTML = '';
    getMergedCharData().forEach(c => {
        fromSel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        toSel.innerHTML   += `<option value="${c.id}">${c.name}</option>`;
    });
    document.getElementById('edge-idx').value = idx;

    // 새로운 선을 만드는 경우 (idx가 -1)
    if (idx === -1) {
        const from = fromSel.options[0].value;
        const to   = toSel.options[1] ? toSel.options[1].value : from;
        const n1   = staticMapData.nodes[from] || { x: 50, y: 50 };
        const n2   = staticMapData.nodes[to]   || { x: 50, y: 50 };
        
        staticMapData.edges.push({ from, to, text: '새 관계', color: '#d7b33d', isDashed: false, pos: 0.5 });
        document.getElementById('edge-idx').value   = staticMapData.edges.length - 1;
        document.getElementById('edge-from').value  = from;
        document.getElementById('edge-to').value    = to;
        document.getElementById('edge-label').value = '새 관계';
        document.getElementById('edge-color').value = '#d7b33d';
        document.getElementById('edge-dash').value  = 'false';
        document.getElementById('btn-delete-edge').style.display = 'none';
    } 
    // 기존에 있던 선을 수정하는 경우
    else {
        const edge = staticMapData.edges[idx];
        fromSel.value = edge.from; toSel.value = edge.to;
        document.getElementById('edge-label').value = edge.text;
        document.getElementById('edge-color').value = edge.color;
        document.getElementById('edge-dash').value  = edge.isDashed.toString();
        document.getElementById('btn-delete-edge').style.display = 'block'; // 삭제 버튼 보이기
    }
    panel.style.display = 'flex'; renderStaticMap(); // 창 띄우고 다시 그리기
};

// 키보드를 치거나 설정값을 바꿀 때마다 화면에 바로 반영해 보여주는 미리보기 함수들입니다.
window.previewEdge = function () {
    const idx = parseInt(document.getElementById('edge-idx').value);
    if (idx < 0 || idx >= staticMapData.edges.length) return;
    staticMapData.edges[idx].from     = document.getElementById('edge-from').value;
    staticMapData.edges[idx].to       = document.getElementById('edge-to').value;
    staticMapData.edges[idx].text     = document.getElementById('edge-label').value;
    staticMapData.edges[idx].isDashed = document.getElementById('edge-dash').value === 'true';
    renderStaticMap();
};

window.previewEdgeColor = function (color) {
    document.getElementById('edge-color').value = color;
    const idx = parseInt(document.getElementById('edge-idx').value);
    if (idx < 0 || idx >= staticMapData.edges.length) return;
    staticMapData.edges[idx].color = color;
    renderStaticMap();
};

window.closeEdgeEditor = function () {
    const panel = document.getElementById('floating-edge-editor');
    if (panel) panel.style.display = 'none';
};

window.deleteEdge = function () {
    const idx = parseInt(document.getElementById('edge-idx').value);
    if (confirm("삭제하시겠습니까?")) {
        staticMapData.edges.splice(idx, 1); // 배열에서 싹둑 잘라냅니다.
        closeEdgeEditor(); renderStaticMap();
    }
};


// ─────────────────────────────────────────────────────────────────
// 9. 인물(Node) 에디터 기능
// ─────────────────────────────────────────────────────────────────
// NPC 등 가짜 인물을 만들거나 진영을 바꿀 수 있는 편집창을 엽니다.
window.openNodeEditor = function (nodeId) {
    const sel = document.getElementById('node-faction');
    sel.innerHTML = '';
    // 진영 선택 메뉴에 존재하는 모든 진영을 넣어줍니다.
    Object.keys(getMergedGroupConfig()).forEach(g => { sel.innerHTML += `<option value="${g}">${g}</option>`; });
    sel.innerHTML += `<option value="_new_">+ 새 진영 만들기</option>`; // 제일 밑에 직접 추가 기능도 넣습니다.
    
    document.getElementById('node-idx').value = nodeId || '';
    document.getElementById('new-faction-fields').style.display = 'none';

    // 새로운 인물을 만드는 경우
    if (!nodeId) {
        document.getElementById('node-modal-title').innerText = "새 인물 추가";
        document.getElementById('node-name').value            = "신규 인물";
        document.getElementById('node-img').value             = "https://placehold.co/100";
        document.getElementById('btn-delete-node').style.display = 'none';
    } 
    // 기존에 있던 인물을 수정하는 경우
    else {
        const cData = getMergedCharData().find(c => c.id === nodeId);
        if (!cData) return;
        document.getElementById('node-modal-title').innerText = "인물 정보 수정";
        document.getElementById('node-name').value            = cData.name;
        document.getElementById('node-img').value             = cData.img;
        sel.value = cData.title;
        // 원래부터 존재하던 4인용 '기본 캐릭터'는 지울 수 없게 막아둡니다.
        document.getElementById('btn-delete-node').style.display = nodeId.startsWith('custom_') ? 'inline-block' : 'none';
    }
    document.getElementById('node-edit-modal').classList.add('show');
};

// "+ 새 진영 만들기"를 골랐을 때만, 직접 진영 이름과 색깔을 입력하는 칸을 보여줍니다.
window.toggleNewFactionFields = function (val) {
    document.getElementById('new-faction-fields').style.display = val === '_new_' ? 'block' : 'none';
};

// 인물 편집창에서 '적용하기' 버튼을 눌렀을 때 실행됩니다.
window.applyNodeEdit = function () {
    const nodeId  = document.getElementById('node-idx').value;
    const name    = document.getElementById('node-name').value.trim();
    const img     = document.getElementById('node-img').value.trim();
    let   faction = document.getElementById('node-faction').value;

    // 만약 완전히 새로운 진영을 만들었다면 색상값을 조합해 등록합니다.
    if (faction === '_new_') {
        faction        = document.getElementById('new-faction-name').value.trim();
        const color    = document.getElementById('new-faction-color').value;
        if (!faction) return alert("새 진영 이름을 입력해주세요.");
        
        const hex = color.replace('#', '');
        const r   = parseInt(hex.substring(0, 2), 16);
        const g   = parseInt(hex.substring(2, 4), 16);
        const b   = parseInt(hex.substring(4, 6), 16);
        staticMapData.customGroups[faction] = { color: `rgba(${r},${g},${b},0.1)`, border: color, name: faction };
    }

    if (!nodeId) { // 새 인물이라면 메모장에 새로 적어넣기
        const newId = 'custom_' + Date.now();
        staticMapData.customNodes.push({ id: newId, name, title: faction, img });
        staticMapData.nodes[newId] = { x: 50, y: 50 }; // 일단 화면 중앙에 소환
    } else if (nodeId.startsWith('custom_')) { // 내가 만든 커스텀 인물이라면 내용 수정
        const cNode = staticMapData.customNodes.find(c => c.id === nodeId);
        if (cNode) { cNode.name = name; cNode.title = faction; cNode.img = img; }
    } else { // 기본 캐릭터라면 내용 수정 불가
        alert("기본 캐릭터의 소속과 이름은 변경할 수 없습니다.");
    }
    renderStaticMap(); closeModal('node-edit-modal');
};

// 커스텀 인물을 화면에서 아예 지워버리는 함수입니다.
window.deleteNode = function () {
    const nodeId = document.getElementById('node-idx').value;
    if (confirm("이 인물을 삭제하시겠습니까?")) {
        // 인물 삭제
        staticMapData.customNodes = staticMapData.customNodes.filter(c => c.id !== nodeId);
        delete staticMapData.nodes[nodeId];
        // 그 인물과 연결된 선들도 전부 같이 끊어버립니다.
        staticMapData.edges = staticMapData.edges.filter(e => e.from !== nodeId && e.to !== nodeId);
        renderStaticMap(); closeModal('node-edit-modal');
    }
};


// ─────────────────────────────────────────────────────────────────
// 10. 데이터베이스에 전체 저장
// ─────────────────────────────────────────────────────────────────
// 툴바의 '위치 저장' 버튼을 누르면 이리저리 옮겨놓은 최종 상태를 서버에 저장합니다.
window.saveMapToDB = async function () {
    const btn = document.getElementById('btn-save-map');
    btn.innerText = "저장 중..."; btn.disabled = true;
    closeEdgeEditor();
    
    // 이 모든 정보를 글자(JSON)로 예쁘게 묶어서 데이터베이스에 올려버립니다.
    const { error } = await supabaseClient
        .from('character_profiles')
        .upsert({ char_id: 'global_static_map', phase: currentMapPhase, relationships: JSON.stringify(staticMapData) });
        
    btn.innerText = "위치 저장"; btn.disabled = false;
    
    if (error) alert("맵 저장 실패: " + error.message);
    else       alert(`${currentMapPhase + 1}부 관계도가 저장되었습니다!`);
};