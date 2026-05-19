/* ================================================================= */
/*  MyRoom.js — 마이룸 (이동, 배치 취소, 조작 화면 및 기능 관리)       */
/*  초보자 안내: 이 파일은 캐릭터의 방(마이룸)을 2.5D 화면으로 그려주고,  */
/*  가구나 벽지, 바닥재를 마우스로 클릭하고 끌어서 배치하는 기능입니다.    */
/* ================================================================= */

const MyRoomSys = {
    // ── 2.5D 화면(등각투영)을 그리기 위한 기본 수학 설정 ────────────────
    TW: 80,   // 타일 하나의 가로 픽셀 크기
    TH: 40,   // 타일 하나의 세로 픽셀 크기
    GW: 6,    // 바닥의 가로 타일 개수 (6칸)
    GH: 6,    // 바닥의 세로 타일 개수 (6칸)
    GZ: 4,    // 벽의 높이 타일 개수 (4칸)
    OX: 300,  // 방이 그려지기 시작하는 화면 상의 기준점(X축)
    OY: 440,  // 방이 그려지기 시작하는 화면 상의 기준점(Y축)

    // ── 방의 현재 상태를 기억하는 메모장 ────────────────────────────
    currentViewId:    null,  // 지금 화면에 띄워진 방 주인의 캐릭터 ID
    isEditMode:       false, // 지금 방을 꾸미는 중인지(true), 그냥 구경만 하는 중인지(false)
    _inventoryItems:  [],    // 내 보관함에 있는 가구와 벽지 목록
    _selectedInvItem: null,  // 마우스로 설치하려고 콕 집어둔 아이템
    _draggingItem:    null,  // 지금 마우스로 드래그해서 끌고 다니고 있는 가구

    floorTiles:    {}, // 바닥재가 깔린 타일들의 정보
    wallLTiles:    {}, // 왼쪽 벽지가 발라진 타일들의 정보
    wallRTiles:    {}, // 오른쪽 벽지가 발라진 타일들의 정보
    furnitureList: [], // 방에 놓여있는 가구들의 위치와 목록

    // ── 좌표 계산기 (가상 공간의 타일 위치를 실제 모니터 픽셀로 변환) ──
    floorPt(gx, gy) { return { x: this.OX + (gx - gy) * this.TW / 2, y: this.OY - (gx + gy) * this.TH / 2 }; },
    wallLPt(gx, gz) { const base = this.floorPt(gx, this.GH); return { x: base.x, y: base.y - gz * this.TH }; },
    wallRPt(gy, gz) { const base = this.floorPt(this.GW, gy); return { x: base.x, y: base.y - gz * this.TH }; },

    // 반대로 모니터의 마우스 픽셀 위치를 가상 공간의 타일 칸 수로 변환해주는 계산기입니다.
    screenToGrid(px, py) {
        const rx = px - this.OX;
        const ry = this.OY - py;
        const gx = Math.round((rx / this.TW) + (ry / this.TH));
        const gy = Math.round((ry / this.TH) - (rx / this.TW));
        return {
            // 방 밖으로 마우스가 나가도 방 끝부분으로 좌표를 제한해줍니다.
            gx: Math.max(0, Math.min(this.GW - 1, gx)),
            gy: Math.max(0, Math.min(this.GH - 1, gy))
        };
    },

    // 타일 하나하나의 4개 모서리 좌표를 구해 다각형(마름모)을 그리는 기능입니다.
    floorPoly(gx, gy) {
        const top = this.floorPt(gx, gy), right = this.floorPt(gx+1, gy), bot = this.floorPt(gx+1, gy+1), left = this.floorPt(gx, gy+1);
        return top.x+','+top.y+' '+right.x+','+right.y+' '+bot.x+','+bot.y+' '+left.x+','+left.y;
    },
    wallLPoly(gx, gz) {
        const tl = this.wallLPt(gx, gz+1), tr = this.wallLPt(gx+1, gz+1), br = this.wallLPt(gx+1, gz), bl = this.wallLPt(gx, gz);
        return tl.x+','+tl.y+' '+tr.x+','+tr.y+' '+br.x+','+br.y+' '+bl.x+','+bl.y;
    },
    wallRPoly(gy, gz) {
        const tr = this.wallRPt(gy, gz+1), tl = this.wallRPt(gy+1, gz+1), bl = this.wallRPt(gy+1, gz), br = this.wallRPt(gy, gz);
        return tr.x+','+tr.y+' '+tl.x+','+tl.y+' '+bl.x+','+bl.y+' '+br.x+','+br.y;
    },

    // '내 방 가기' 혹은 '이웃 방문' 탭 버튼의 색상을 켜고 끄는 기능입니다.
    _updateTabs(idx) {
        document.querySelectorAll('#myroom-tabs .phase-btn').forEach((t, i) => t.classList.toggle('active', i === idx));
    },

    // ==========================================
    // 1. 방 화면 불러오기
    // ==========================================
    
    // 내 방을 열 때 실행됩니다.
    async loadMyRoom() {
        if (!currentUser) return alert('로그인이 필요합니다.');
        document.getElementById('room-visit-list').style.display  = 'none';
        document.getElementById('room-canvas-area').style.display = 'block';
        this._updateTabs(0);
        await this._renderRoom(charOwners[currentUser.email], true);
    },

    // 남의 방을 구경하기 위해 이웃 목록을 열 때 실행됩니다.
    async loadVisitList() {
        document.getElementById('room-visit-list').style.display  = 'block';
        document.getElementById('room-canvas-area').style.display = 'none';
        this._updateTabs(1);
        const listDiv = document.getElementById('room-neighbors');
        if (!listDiv) return;
        
        // 이웃 목록 화면에 캐릭터들의 얼굴과 방 이름을 그려줍니다.
        listDiv.innerHTML = charData.map(c => {
            const id  = 'char-' + c.id;
            const p   = allProfiles.find(x => x.char_id === id && x.phase === 0);
            const img = (p && p.profile_image) ? p.profile_image : (c.img || 'https://placehold.co/100x100/3a3a36/888?text=Img');
            return `<div class="relation-card" style="cursor:pointer;" onclick="MyRoomSys.visitRoom('${id}','${c.name}')">
                    <img src="${img}" class="relation-avatar"><div class="relation-name">${c.name}의 방</div></div>`;
        }).join('');
    },

    // 이웃 목록에서 특정 이웃을 클릭해서 그 방에 들어갈 때 실행됩니다.
    async visitRoom(charId, charName) {
        document.getElementById('room-visit-list').style.display  = 'none';
        document.getElementById('room-canvas-area').style.display = 'block';
        this._updateTabs(1);
        await this._renderRoom(charId, false, charName || '');
    },

    // 실제로 데이터베이스에서 방의 가구 배치도를 가져와 화면을 그릴 준비를 하는 핵심 함수입니다.
    async _renderRoom(charId, isMine, charName) {
        this.currentViewId    = charId;
        this.isEditMode       = false; // 처음 열 땐 구경 모드로 엽니다.
        this._inventoryItems  = [];
        this._selectedInvItem = null;
        this._draggingItem    = null;

        // 내 방이면 '꾸미기' 버튼을 보여주고, 남의 방이면 '목록으로 돌아가기' 버튼을 보여줍니다.
        document.getElementById('btn-room-edit').style.display  = isMine ? 'inline-block' : 'none';
        document.getElementById('btn-room-back').style.display  = isMine ? 'none' : 'inline-block';
        document.getElementById('btn-room-save').style.display  = 'none';
        document.getElementById('room-inventory').style.display = 'none';

        // 상단에 '누구누구의 방'이라고 간판 글씨를 바꿔줍니다.
        document.getElementById('room-owner-name').innerText = isMine ? (charData.find(c => 'char-' + c.id === charId)?.name || '나') + '의 방' : charName + '의 방';

        // 데이터베이스에서 이 방의 가구 배치도 데이터를 가져옵니다.
        const { data: profile } = await supabaseClient.from('character_profiles').select('room_data').eq('char_id', charId).eq('phase', 0).single();

        // 가져오기 전에 화면을 싹 비워서 초기화합니다.
        this.floorTiles    = {};
        this.wallLTiles    = {};
        this.wallRTiles    = {};
        this.furnitureList = [];

        if (profile && profile.room_data) {
            try {
                // 저장된 가구 배치도를 풀어서 변수에 담아줍니다.
                const raw = typeof profile.room_data === 'string' ? JSON.parse(profile.room_data) : profile.room_data;
                if (raw && raw.v === 2) {
                    this.floorTiles    = raw.floorTiles    || {};
                    this.wallLTiles    = raw.wallLTiles    || {};
                    this.wallRTiles    = raw.wallRTiles    || {};
                    this.furnitureList = raw.furnitureList || [];
                }
            } catch (e) {}
        }
        // 변수에 담긴 정보를 바탕으로 도화지(캔버스)에 진짜 그림을 그립니다.
        this._buildCanvas();
    },

    // ==========================================
    // 2. 방 꾸미기 모드 전환
    // ==========================================
    // '꾸미기' 버튼을 눌렀을 때 실행됩니다.
    async toggleEditMode() {
        this.isEditMode       = !this.isEditMode;
        this._selectedInvItem = null;
        this._draggingItem    = null;

        if (this.isEditMode) {
            // 꾸미기 모드 켜짐: 보관함 목록을 열고, '저장' 버튼을 보여줍니다.
            document.getElementById('room-inventory').style.display = 'block';
            document.getElementById('btn-room-edit').style.display  = 'none';
            document.getElementById('btn-room-save').style.display  = 'inline-block';
            await this._loadInventory();
        } else {
            // 꾸미기 모드 꺼짐: 구경 모드로 화면을 되돌립니다.
            this._renderRoom(this.currentViewId, true);
        }
        this._buildCanvas();
    },

    // ==========================================
    // 3. 내 가구 보관함(인벤토리) 불러오기
    // ==========================================
    async _loadInventory() {
        // 내가 가진 가구 전체 목록을 가져옵니다.
        const { data: profile } = await supabaseClient.from('character_profiles').select('furniture_inventory').eq('char_id', this.currentViewId).eq('phase', 0).single();
        let furn = [];
        if (profile && profile.furniture_inventory) {
            try { furn = typeof profile.furniture_inventory === 'string' ? JSON.parse(profile.furniture_inventory) : profile.furniture_inventory; } catch (e) {}
        }
        if (!Array.isArray(furn)) furn = [];

        // 방 안에 이미 설치된 가구들이 몇 개나 있는지 세어봅니다.
        const usedCount = {};
        this.furnitureList.forEach(p => { usedCount[p.sourceId] = (usedCount[p.sourceId] || 0) + 1; });

        // 설치하고 남은 개수(_remaining)를 계산해서 목록을 업데이트합니다.
        this._inventoryItems = furn.filter(it => it && it.name).map((it, i) => {
            const sid       = it.id || ('_inv_' + i);
            const total     = parseInt(it.count) || 1;
            const usedFloor = Object.values(this.floorTiles).filter(t => t.sid === sid).length;
            const usedWallL = Object.values(this.wallLTiles).filter(t => t.sid === sid).length;
            const usedWallR = Object.values(this.wallRTiles).filter(t => t.sid === sid).length;
            const usedFurn  = usedCount[sid] || 0;
            const used      = usedFloor + usedWallL + usedWallR + usedFurn;
            return { ...it, _sid: sid, _total: total, _remaining: Math.max(0, total - used) };
        });
        
        // 보관함 화면에 가구 상자들을 그려줍니다.
        this._renderInv();
    },

    // 보관함 목록에 가구 아이콘들을 예쁘게 그려넣는 기능입니다.
    _renderInv() {
        const wrap = document.getElementById('room-inventory-list');
        if (!wrap) return;
        wrap.innerHTML = '';

        if (!this._inventoryItems.length) {
            wrap.insertAdjacentHTML('beforeend', '<p style="color:#777;font-size:0.82rem;line-height:1.5;text-align:center;width:100%;">보유한 아이템이 없습니다.</p>');
            return;
        }

        // 아이템을 설치하려고 하나 집어든 상태라면, '내려놓기' 버튼을 만들어 띄웁니다.
        if (this._selectedInvItem) {
            const cancel = document.createElement('div');
            cancel.style.cssText = 'width:100%;padding:5px 8px;background:rgba(255,77,77,0.12);border:1px dashed #ff4d4d;border-radius:6px;cursor:pointer;font-size:10px;color:#ff4d4d;font-weight:bold;text-align:center;margin-bottom:6px;';
            cancel.innerHTML = '[X] 손에 든 아이템 내려놓기';
            cancel.onclick = () => { this._selectedInvItem = null; this._renderInv(); this._buildCanvas(); };
            wrap.appendChild(cancel);
        }

        // 내가 가진 가구들을 하나하나 그려넣습니다.
        this._inventoryItems.forEach(item => {
            const el = document.createElement('div');
            el.className = 'inv-furniture-item';
            el.style.position = 'relative';
            const remaining = item._remaining;

            const typeBadge = item.type === 'wallpaper' ? '<div style="position:absolute;bottom:2px;right:2px;background:#4c8bf5;color:#fff;font-size:8px;padding:1px 3px;border-radius:3px;z-index:5;">벽지</div>' :
                              item.type === 'floor'     ? '<div style="position:absolute;bottom:2px;right:2px;background:#4caf50;color:#fff;font-size:8px;padding:1px 3px;border-radius:3px;z-index:5;">바닥</div>' : '';

            // 남은 수량을 표시해주는 조그만 글씨 표표입니다.
            const cntBadge = item._total > 1 ? `<div style="position:absolute;top:2px;left:2px;background:${remaining > 0 ? '#d7b33d' : '#555'};color:${remaining > 0 ? '#000' : '#aaa'};font-size:8px;font-weight:bold;padding:1px 4px;border-radius:3px;z-index:5;">${remaining}/${item._total}</div>` : '';
            const isSelected = this._selectedInvItem && this._selectedInvItem._sid === item._sid;

            // 이미 방에 다 배치해서 남은 개수가 0개면 투명하게 만들어서 클릭을 막습니다.
            if (remaining <= 0) {
                el.style.opacity = '0.35'; el.style.cursor = 'default';
                el.innerHTML = `<img src="${item.img}" style="max-width:80%;max-height:80%;">${cntBadge}${typeBadge}<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;background:rgba(0,0,0,0.55);z-index:6;border-radius:4px;">배치됨</div>`;
            } else {
                el.style.cursor = 'pointer';
                el.innerHTML = `<img src="${item.img}" style="max-width:80%;max-height:80%;">${cntBadge}${typeBadge}`;
                
                // 지금 손에 집고 있는 가구는 노란 테두리로 빛나게 합니다.
                if (isSelected) {
                    el.style.outline = '2px solid var(--accent-color,#d7b33d)';
                    el.style.outlineOffset = '2px';
                    el.style.background = 'rgba(215,179,61,0.15)';
                }
                
                // 가구를 클릭하면 내 손에 쥐거나(설치 준비), 이미 쥔 거라면 다시 내려놓습니다.
                el.onclick = () => {
                    this._selectedInvItem = isSelected ? null : item;
                    this._renderInv();
                    this._buildCanvas();
                };
            }
            wrap.appendChild(el);
        });
    },

    // ==========================================
    // 4. 그림 그릴 도화지(SVG 캔버스) 세팅 및 가구 그리기
    // ==========================================
    _buildCanvas() {
        const container = document.getElementById('room-canvas');
        if (!container) return;

        const CW = 680, CH = 480; // 도화지 크기 설정
        let svg = container.querySelector('svg.iso-room');
        if (!svg) {
            // 도화지가 없으면 새로 만듭니다.
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'iso-room');
            svg.setAttribute('viewBox', `0 0 ${CW} ${CH}`);
            svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;';
            
            // 허공(빈 배경)에 대고 마우스 우클릭을 하면 손에 들고 있던 아이템을 내려놓습니다.
            svg.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (this._selectedInvItem) {
                    this._selectedInvItem = null;
                    this._renderInv();
                    this._buildCanvas();
                }
            });
            
            container.appendChild(svg);
        }
        svg.innerHTML = ''; // 그림을 싹 지우고 다시 그리기 시작합니다.

        // 도화지에 그릴 밑준비 세팅
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        defs.innerHTML = '<style>.iso-tile{shape-rendering:crispEdges;}</style>';
        svg.appendChild(defs);

        this._drawFloor(svg);      // 바닥을 그립니다.
        this._drawWallL(svg);      // 왼쪽 벽을 그립니다.
        this._drawWallR(svg);      // 오른쪽 벽을 그립니다.

        // 꾸미기 모드일 때는 마우스를 올려서 설치할 수 있게 투명한 클릭 영역을 만들어줍니다.
        if (this.isEditMode) this._attachTileHits(svg);

        this._drawFurniture(svg);  // 마지막으로 가구들을 배치합니다.
        this._drawEdges(svg);      // 방 모서리 테두리 선을 그어 뚜렷하게 만듭니다.
    },

    // 바닥 타일 그리기 기능
    _drawFloor(svg) {
        for (let gy = this.GH - 1; gy >= 0; gy--) {
            for (let gx = 0; gx < this.GW; gx++) {
                const key = `${gx},${gy}`;
                const tile = this.floorTiles[key];
                const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                poly.setAttribute('class', 'iso-tile');
                poly.setAttribute('points', this.floorPoly(gx, gy)); // 마름모 형태로 점 찍기

                if (tile && tile.img) { // 이미지가 있는 바닥재면 그림을 깔고
                    const pid = `fl_${gx}_${gy}`;
                    this._ensureImgPattern(svg, pid, tile.img, true);
                    poly.setAttribute('fill', `url(#${pid})`);
                } else if (tile && tile.color) { // 단색이면 색을 칠하고
                    poly.setAttribute('fill', tile.color);
                } else { // 아무것도 안 깔았으면 기본 나무색을 칠합니다.
                    poly.setAttribute('fill', (gx + gy) % 2 === 0 ? '#c8b89a' : '#bda98a');
                }
                poly.setAttribute('stroke', '#a09070');
                poly.setAttribute('stroke-width', (tile && tile.img) ? '0' : '0.5');
                svg.appendChild(poly);
            }
        }
    },

    // 왼쪽 벽 타일 그리기 기능
    _drawWallL(svg) {
        for (let gz = 0; gz < this.GZ; gz++) {
            for (let gx = 0; gx < this.GW; gx++) {
                const key = `${gx},${gz}`;
                const tile = this.wallLTiles[key];
                const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                poly.setAttribute('class', 'iso-tile');
                poly.setAttribute('points', this.wallLPoly(gx, gz));

                if (tile && tile.bgImg) {
                    const pid = `wl_${gx}_${gz}`;
                    this._ensureImgPattern(svg, pid, tile.bgImg);
                    poly.setAttribute('fill', `url(#${pid})`);
                } else if (tile && tile.color) {
                    poly.setAttribute('fill', tile.color);
                } else {
                    poly.setAttribute('fill', '#ddd6ca');
                }
                poly.setAttribute('stroke', '#bbb4a8');
                poly.setAttribute('stroke-width', '0.5');
                svg.appendChild(poly);
            }
        }
    },

    // 오른쪽 벽 타일 그리기 기능
    _drawWallR(svg) {
        for (let gz = 0; gz < this.GZ; gz++) {
            for (let gy = 0; gy < this.GH; gy++) {
                const key = `${gy},${gz}`;
                const tile = this.wallRTiles[key];
                const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                poly.setAttribute('class', 'iso-tile');
                poly.setAttribute('points', this.wallRPoly(gy, gz));

                if (tile && tile.bgImg) {
                    const pid = `wr_${gy}_${gz}`;
                    this._ensureImgPattern(svg, pid, tile.bgImg);
                    poly.setAttribute('fill', `url(#${pid})`);
                } else if (tile && tile.color) {
                    // 오른쪽 벽은 입체감을 주려고 색을 살짝 어둡게 만듭니다.
                    poly.setAttribute('fill', this._darken(tile.color, 0.85));
                } else {
                    poly.setAttribute('fill', '#c8c2b6');
                }
                poly.setAttribute('stroke', '#aaa49a');
                poly.setAttribute('stroke-width', '0.5');
                svg.appendChild(poly);
            }
        }
    },

    // 가구 그리기 및 마우스 드래그 기능 추가
    _drawFurniture(svg) {
        this.furnitureList.forEach(item => {
            const pt = this.floorPt(item.gx, item.gy);
            const imgEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            imgEl.setAttribute('href', item.img);
            
            const w = (item.w || 1) * this.TW;
            const h = item.h || 80;
            imgEl.setAttribute('x', pt.x - w / 2);
            imgEl.setAttribute('y', pt.y - h + this.TH); 
            imgEl.setAttribute('width',  w);
            imgEl.setAttribute('height', h);
            imgEl.setAttribute('preserveAspectRatio', 'xMidYMax meet');
            imgEl.style.imageRendering = 'pixelated';

            // 꾸미기 모드일 때는 마우스로 잡고 끌 수 있게 세팅합니다.
            if (this.isEditMode) {
                imgEl.style.cursor = 'grab';

                // 1. 가구를 마우스 좌클릭으로 '잡았을 때'
                imgEl.addEventListener('mousedown', (e) => {
                    if (e.button !== 0) return; // 왼쪽 클릭만 인정합니다.
                    e.preventDefault(); 
                    e.stopPropagation();

                    // 다른 아이템을 들고 있는 상태라면, 그걸 일단 먼저 안전하게 내려놓습니다.
                    if (this._selectedInvItem) {
                        this._selectedInvItem = null;
                        this._renderInv();
                    }
                    
                    this._draggingItem = item;
                    imgEl.style.cursor = 'grabbing'; // 잡은 손 모양으로 커서 변경
                    imgEl.style.opacity = '0.7'; // 끌고 다닐 때 반투명해지게 만들기

                    // 마우스가 클릭한 지점과 가구 사이의 틈(오프셋)을 계산해둡니다.
                    const rect = svg.getBoundingClientRect();
                    const startMx = (e.clientX - rect.left) * (svg.viewBox.baseVal.width / rect.width);
                    const startMy = (e.clientY - rect.top) * (svg.viewBox.baseVal.height / rect.height);
                    
                    const currentBasePt = this.floorPt(item.gx, item.gy);
                    const offsetX = currentBasePt.x - startMx;
                    const offsetY = currentBasePt.y - startMy;

                    // 2. 가구를 잡고 이리저리 '움직일 때'
                    const onMouseMove = (moveEvent) => {
                        const mx = (moveEvent.clientX - rect.left) * (svg.viewBox.baseVal.width / rect.width);
                        const my = (moveEvent.clientY - rect.top) * (svg.viewBox.baseVal.height / rect.height);
                        imgEl.setAttribute('x', mx + offsetX - w / 2);
                        imgEl.setAttribute('y', my + offsetY - h + this.TH / 2); // 살짝 들어올린 느낌을 줍니다.
                    };

                    // 3. 마우스를 떼서 '내려놓을 때'
                    const onMouseUp = (upEvent) => {
                        window.removeEventListener('mousemove', onMouseMove);
                        window.removeEventListener('mouseup', onMouseUp);
                        
                        if (!this._draggingItem) return;

                        const mx = (upEvent.clientX - rect.left) * (svg.viewBox.baseVal.width / rect.width);
                        const my = (upEvent.clientY - rect.top) * (svg.viewBox.baseVal.height / rect.height);
                        
                        // 마우스를 놓은 위치를 타일 칸 수로 변환하여 딱 맞게 붙여넣습니다.
                        const basePx = mx + offsetX;
                        const basePy = my + offsetY;
                        const gridPos = this.screenToGrid(basePx, basePy);
                        
                        item.gx = gridPos.gx;
                        item.gy = gridPos.gy;
                        
                        this._draggingItem = null; // 손에서 놓습니다.
                        this._buildCanvas(); // 위치가 바뀌었으니 화면을 한 번 새로 그립니다.
                    };

                    window.addEventListener('mousemove', onMouseMove);
                    window.addEventListener('mouseup', onMouseUp);
                });

                // 4. 가구를 우클릭해서 아예 '치워버릴 때' (삭제)
                imgEl.addEventListener('contextmenu', (e) => {
                    e.preventDefault(); e.stopPropagation();
                    if (this._draggingItem) return; // 끌고 다니는 중에는 지우지 못하게 합니다.
                    
                    // 만약 손에 뭔가 설치하려고 아이템을 들고 있는 상태라면, 
                    // 가구가 지워지는 참사를 막기 위해 손에 든 것만 조용히 '내려놓기' 처리합니다.
                    if (this._selectedInvItem) {
                        this._selectedInvItem = null;
                        this._renderInv();
                        this._buildCanvas();
                        return;
                    }
                    
                    // 인벤토리에 지운 가구의 수량을 다시 +1 올려줍니다.
                    const inv = this._inventoryItems.find(it => it._sid === item.sourceId);
                    if (inv) inv._remaining = Math.min(inv._total, inv._remaining + 1);
                    
                    // 방의 가구 목록에서 이 가구를 완전히 지웁니다.
                    this.furnitureList = this.furnitureList.filter(f => f.id !== item.id);
                    this._buildCanvas();
                    this._renderInv();
                });
            }
            svg.appendChild(imgEl);
        });
    },

    // 바닥과 벽이 만나는 모서리 부분에 까만 선을 그어 입체감을 살려주는 기능입니다.
    _drawEdges(svg) {
        const strokeColor = '#7a6e60', strokeW = '2';
        for (let gx = 0; gx <= this.GW; gx++) this._line(svg, this.floorPt(gx, this.GH).x, this.floorPt(gx, this.GH).y, this.wallLPt(gx, this.GZ).x, this.wallLPt(gx, this.GZ).y, strokeColor, strokeW);
        for (let gy = 0; gy <= this.GH; gy++) this._line(svg, this.floorPt(this.GW, gy).x, this.floorPt(this.GW, gy).y, this.wallRPt(gy, this.GZ).x, this.wallRPt(gy, this.GZ).y, strokeColor, strokeW);
    },

    // 선 그리기 보조 기능
    _line(svg, x1, y1, x2, y2, color, w) {
        const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l.setAttribute('x1', x1); l.setAttribute('y1', y1); l.setAttribute('x2', x2); l.setAttribute('y2', y2);
        l.setAttribute('stroke', color); l.setAttribute('stroke-width', w || '1'); l.setAttribute('stroke-linecap', 'square');
        l.style.pointerEvents = 'none'; // 사람이 선을 클릭하는 걸 막아줍니다.
        svg.appendChild(l);
    },

    // 꾸미기 모드일 때 벽과 바닥에 마우스를 올리면 하얗게 빛나며 위치를 알려주는 투명판을 깝니다.
    _attachTileHits(svg) {
        const self = this;
        // 바닥 타일 설정
        for (let gy = 0; gy < this.GH; gy++) {
            for (let gx = 0; gx < this.GW; gx++) {
                const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                poly.setAttribute('points', this.floorPoly(gx, gy));
                poly.setAttribute('fill', 'transparent'); poly.setAttribute('stroke', 'none'); poly.style.cursor = 'pointer';
                const _gx = gx, _gy = gy;
                
                // 마우스를 올렸을 때 하얗게 빛남
                poly.addEventListener('mouseover', function () { if(!self._draggingItem) this.setAttribute('fill', 'rgba(255,255,255,0.18)'); });
                poly.addEventListener('mouseout',  function () { this.setAttribute('fill', 'transparent'); });
                // 좌클릭: 내 손에 들린 아이템(바닥재, 가구 등)을 그 자리에 설치함
                poly.addEventListener('click', () => { if(!self._draggingItem) self._onTileClick('floor', _gx, _gy); });
                // 우클릭: 그 자리에 깔린 바닥재를 지움
                poly.addEventListener('contextmenu', (e) => { e.preventDefault(); self._onTileRightClick('floor', _gx, _gy); });
                svg.appendChild(poly);
            }
        }
        // 왼쪽 벽 타일 설정 (위와 원리가 같습니다)
        for (let gz = 0; gz < this.GZ; gz++) {
            for (let gx = 0; gx < this.GW; gx++) {
                const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                poly.setAttribute('points', this.wallLPoly(gx, gz));
                poly.setAttribute('fill', 'transparent'); poly.setAttribute('stroke', 'none'); poly.style.cursor = 'pointer';
                const _gx = gx, _gz = gz;
                poly.addEventListener('mouseover', function () { if(!self._draggingItem) this.setAttribute('fill', 'rgba(255,255,255,0.18)'); });
                poly.addEventListener('mouseout',  function () { this.setAttribute('fill', 'transparent'); });
                poly.addEventListener('click', () => { if(!self._draggingItem) self._onTileClick('wallL', _gx, _gz); });
                poly.addEventListener('contextmenu', (e) => { e.preventDefault(); self._onTileRightClick('wallL', _gx, _gz); });
                svg.appendChild(poly);
            }
        }
        // 오른쪽 벽 타일 설정
        for (let gz = 0; gz < this.GZ; gz++) {
            for (let gy = 0; gy < this.GH; gy++) {
                const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                poly.setAttribute('points', this.wallRPoly(gy, gz));
                poly.setAttribute('fill', 'transparent'); poly.setAttribute('stroke', 'none'); poly.style.cursor = 'pointer';
                const _gy = gy, _gz = gz;
                poly.addEventListener('mouseover', function () { if(!self._draggingItem) this.setAttribute('fill', 'rgba(200,200,255,0.15)'); });
                poly.addEventListener('mouseout',  function () { this.setAttribute('fill', 'transparent'); });
                poly.addEventListener('click', () => { if(!self._draggingItem) self._onTileClick('wallR', _gy, _gz); });
                poly.addEventListener('contextmenu', (e) => { e.preventDefault(); self._onTileRightClick('wallR', _gy, _gz); });
                svg.appendChild(poly);
            }
        }
    },

    // ==========================================
    // 5. 타일 클릭 시 실제로 가구나 벽지를 설치하는 기능
    // ==========================================
    _onTileClick(face, a, b) {
        const item = this._selectedInvItem;
        if (!item || this._draggingItem) return; // 손에 들고 있는 게 없으면 넘어갑니다.

        if (item._remaining <= 0) return alert('보유 수량이 부족합니다.');

        if (item.type === 'wallpaper') {
            // 벽지를 클릭했을 때
            if (face === 'wallL') {
                const key = `${a},${b}`;
                if (this.wallLTiles[key] && this.wallLTiles[key].sid === item._sid) return; 
                // 원래 발려있던 벽지가 있으면 다시 가방에 +1 넣어줍니다.
                if (this.wallLTiles[key]) {
                    const prevInv = this._inventoryItems.find(it => it._sid === this.wallLTiles[key].sid);
                    if (prevInv) prevInv._remaining = Math.min(prevInv._total, prevInv._remaining + 1);
                } else item._remaining -= 1; // 내 가방에선 수량을 -1 뺍니다.
                this.wallLTiles[key] = { sid: item._sid, color: item.colorL || item.color || '#e8c4b8', bgImg: item.bgImg || null };
            } else if (face === 'wallR') {
                const key = `${a},${b}`;
                if (this.wallRTiles[key] && this.wallRTiles[key].sid === item._sid) return;
                if (this.wallRTiles[key]) {
                    const prevInv = this._inventoryItems.find(it => it._sid === this.wallRTiles[key].sid);
                    if (prevInv) prevInv._remaining = Math.min(prevInv._total, prevInv._remaining + 1);
                } else item._remaining -= 1;
                this.wallRTiles[key] = { sid: item._sid, color: item.colorR || item.color || '#d4b0a0', bgImg: item.bgImg || null };
            } else return alert('벽지는 벽에만 설치할 수 있습니다.');
        } else if (item.type === 'floor') {
            // 바닥재를 클릭했을 때
            if (face !== 'floor') return;
            const key = `${a},${b}`;
            if (this.floorTiles[key] && this.floorTiles[key].sid === item._sid) return;
            if (this.floorTiles[key]) {
                const prevInv = this._inventoryItems.find(it => it._sid === this.floorTiles[key].sid);
                if (prevInv) prevInv._remaining = Math.min(prevInv._total, prevInv._remaining + 1);
            } else item._remaining -= 1;
            this.floorTiles[key] = { sid: item._sid, color: item.color || item.colorL || '#a08060', img: item.img || null };
        } else {
            // 일반 가구를 클릭했을 때
            if (face !== 'floor') return; // 가구는 바닥에만 놓습니다.
            this.furnitureList.push({
                id:       'f_' + Date.now() + '_' + Math.floor(Math.random() * 9999),
                sourceId: item._sid,
                img:      item.img,
                gx:       a,
                gy:       b,
                w:        item.tileW || 1,
                h:        item.height || 80,
            });
            item._remaining -= 1;
        }
        
        // 다 설치했으니 화면을 새로 그리고 인벤토리 숫자도 갱신합니다.
        this._buildCanvas();
        this._renderInv();
    },

    // 빈 타일에 우클릭해서 벽지나 바닥재를 아예 뜯어내는 기능
    _onTileRightClick(face, a, b) {
        if (this._draggingItem) return;
        
        // 아이템을 손에 든 상태로 우클릭을 하면, 바닥을 뜯는 대신 그냥 아이템을 얌전히 바닥에 내려놓습니다(설치 취소).
        if (this._selectedInvItem) {
            this._selectedInvItem = null;
            this._renderInv();
            this._buildCanvas();
            return;
        }

        const key = `${a},${b}`;
        let removedItemSid = null;

        // 어느 면을 뜯었는지 확인하고 방 데이터에서 지웁니다.
        if (face === 'floor' && this.floorTiles[key]) {
            removedItemSid = this.floorTiles[key].sid;
            delete this.floorTiles[key];
        } else if (face === 'wallL' && this.wallLTiles[key]) {
            removedItemSid = this.wallLTiles[key].sid;
            delete this.wallLTiles[key];
        } else if (face === 'wallR' && this.wallRTiles[key]) {
            removedItemSid = this.wallRTiles[key].sid;
            delete this.wallRTiles[key];
        }

        // 지운 아이템은 다시 내 가방 숫자로 돌려줍니다(+1).
        if (removedItemSid) {
            const inv = this._inventoryItems.find(it => it._sid === removedItemSid);
            if (inv) inv._remaining = Math.min(inv._total, inv._remaining + 1);
            this._buildCanvas();
            this._renderInv();
        }
    },

    // ==========================================
    // 7. 자잘한 보조 기능들
    // ==========================================
    // 타일에 무늬(이미지)를 입히기 위해 필요한 밑준비 도우미 함수입니다.
    _ensureImgPattern(svg, id, imgUrl, isFloor=false) {
        if (svg.querySelector('#' + id)) return;
        let defs = svg.querySelector('defs');
        if (!defs) { defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs'); svg.prepend(defs); }
        
        const pat = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
        pat.setAttribute('id', id);
        pat.setAttribute('patternUnits', 'userSpaceOnUse');
        pat.setAttribute('width', this.TW);
        pat.setAttribute('height', isFloor ? this.TH * 2 : this.TH * 2 * 2); 
        
        const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        img.setAttribute('href', imgUrl);
        img.setAttribute('width', this.TW);
        img.setAttribute('height', isFloor ? this.TH * 2 : this.TH * 2 * 2);
        img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
        
        pat.appendChild(img);
        defs.appendChild(pat);
    },

    // 오른쪽 벽 색상을 살짝 어둡게 그늘지게 만들어주는 색상 계산기입니다.
    _darken(hex, factor) {
        try {
            const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
            const rr = Math.round(r * factor).toString(16).padStart(2, '0'), gg = Math.round(g * factor).toString(16).padStart(2, '0'), bb = Math.round(b * factor).toString(16).padStart(2, '0');
            return `#${rr}${gg}${bb}`;
        } catch (e) { return hex; }
    },

    // ==========================================
    // 8. 내 방 저장하기
    // ==========================================
    // 꾸미기 모드에서 '저장' 버튼을 누르면 데이터베이스에 배치 결과를 확정하여 올립니다.
    async saveRoom() {
        if (this._draggingItem) return alert('가구를 완전히 내려놓은 후 저장해주세요.');
        if (!confirm('현재 배치를 저장하시겠습니까?')) return;

        // 마이룸 버전(v: 2) 명시와 함께 모든 타일과 가구 데이터를 묶습니다.
        const payload = { v: 2, floorTiles: this.floorTiles, wallLTiles: this.wallLTiles, wallRTiles: this.wallRTiles, furnitureList: this.furnitureList };
        
        // 저장!
        const { error } = await supabaseClient.from('character_profiles').update({ room_data: payload }).eq('char_id', this.currentViewId).eq('phase', 0);
        
        if (error) { console.error(error); return alert('저장 오류가 발생했습니다.'); }
        alert('성공적으로 저장되었습니다!');
        this.toggleEditMode(); // 꾸미기 모드를 끄고 구경 모드로 돌아갑니다.
    }
};

// =================================================================
// 내 마음대로 가구를 그리는 'DIY 가구 제작소' 시스템
// =================================================================

const _originalUseInvItemOne = window.useInvItemOne;

// 인벤토리에서 아이템을 사용하려 할 때, 그게 만약 '가구 생성권'이라면 공방 팝업창을 열어주도록 슬쩍 가로채는 기능입니다.
window.useInvItemOne = function() {
    const itemName = document.getElementById('inv-slot-name').value || '';
    if (itemName.includes('생성권') || itemName.includes('DIY')) {
        // 인벤토리 팝업을 잠시 끕니다.
        const invModal = document.getElementById('inv-modal');
        if (invModal) { invModal.style.display = 'none'; invModal.classList.remove('show'); }
        
        // 제작소 팝업 입력칸을 깨끗하게 비웁니다.
        document.getElementById('diy-name').value = '';
        document.getElementById('diy-desc').value = '';
        document.getElementById('diy-width').value = '80';
        document.getElementById('diy-height').value = '80';
        document.getElementById('diy-file').value = '';

        // 제작소 팝업을 띄웁니다.
        const diyModal = document.getElementById('diy-modal');
        if (diyModal) {
            diyModal.style.display = 'flex'; diyModal.classList.add('show');
            const closeBtn = diyModal.querySelector('.auth-close');
            if (closeBtn) {
                closeBtn.onclick = () => { diyModal.style.display = 'none'; diyModal.classList.remove('show'); };
            }
        }
        return; 
    }
    // 일반 아이템이면 원래 정해진 기능(1개 소모)을 실행합니다.
    if (typeof _originalUseInvItemOne === 'function') { _originalUseInvItemOne(); }
};

// 가구 제작소에서 정보를 다 입력하고 '제작하기' 버튼을 눌렀을 때 실행됩니다.
window.submitDiyFurniture = async function() {
    const btn = document.getElementById('diy-submit-btn');
    const nameInput = document.getElementById('diy-name').value.trim();
    const descInput = document.getElementById('diy-desc').value.trim();
    const widthInput = parseInt(document.getElementById('diy-width').value) || 80;
    const heightInput = parseInt(document.getElementById('diy-height').value) || 80;
    const fileInput = document.getElementById('diy-file');

    if (!nameInput) return alert('가구 이름을 입력해주세요.');
    if (!fileInput.files || fileInput.files.length === 0) return alert('가구 이미지를 첨부해주세요.');
    if (!currentUser) return alert('로그인이 필요합니다.');
    const myCharId = charOwners[currentUser.email];
    if (!myCharId) return alert('캐릭터 권한이 없습니다.');

    btn.disabled = true; btn.innerText = '공방에서 제작 중...';

    try {
        let imgUrl = '';
        // 사용자가 첨부한 그림을 인터넷 이미지 서버(ImgBB)에 올려서 주소로 만듭니다.
        if (typeof uploadToImgbb === 'function') {
            imgUrl = await uploadToImgbb(fileInput.files[0]);
            if (!imgUrl) throw new Error('이미지 업로드 실패');
        } else {
            // 서버 기능이 끊겼으면 웹 브라우저가 임시로 기억하는 파일로 만듭니다.
            imgUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader(); reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => reject(new Error('이미지 읽기 실패')); reader.readAsDataURL(fileInput.files[0]);
            });
        }

        // 서버에서 내 소지품과 가구 보관함을 열어봅니다.
        const { data: profile, error: fetchErr } = await supabaseClient.from('character_profiles').select('inventory, furniture_inventory').eq('char_id', myCharId).eq('phase', 0).single();
        if (fetchErr) throw fetchErr;

        let generalInv = [], furnInv = [];
        try { if (profile.inventory) generalInv = typeof profile.inventory === 'string' ? JSON.parse(profile.inventory) : profile.inventory; } catch(e){}
        try { if (profile.furniture_inventory) furnInv = typeof profile.furniture_inventory === 'string' ? JSON.parse(profile.furniture_inventory) : profile.furniture_inventory; } catch(e){}
        if (!Array.isArray(generalInv)) generalInv = []; if (!Array.isArray(furnInv)) furnInv = [];

        // 소지품에 진짜로 생성권이 남아있는지 꼼꼼히 확인합니다.
        const ticketIdx = generalInv.findIndex(it => (it.name || '').includes('생성권') || (it.name || '').includes('DIY'));
        if (ticketIdx === -1) throw new Error('소지품에 가구 생성권이 없습니다! 상점에서 먼저 구매해주세요.');

        // 생성권을 1장 찢어서 버립니다. (-1장)
        const ticketCount = parseInt(generalInv[ticketIdx].count) || 1;
        if (ticketCount > 1) { generalInv[ticketIdx].count = ticketCount - 1; } else { generalInv.splice(ticketIdx, 1); }

        // 내 가구 보관함(furnInv)에 지금 막 만들어진 따끈따끈한 새 가구를 넣어줍니다.
        const tileW = Math.max(1, Math.round(widthInput / 80)); 
        furnInv.push({ id: 'custom_furn_' + Date.now(), name: nameInput, desc: descInput || '직접 만든 특별한 가구', img: imgUrl, type: 'furniture', count: 1, tileW: tileW, height: heightInput });

        // 생성권이 찢긴 소지품과 새 가구가 들어간 보관함을 다시 데이터베이스에 저장합니다.
        const { error: updateErr } = await supabaseClient.from('character_profiles').update({ inventory: JSON.stringify(generalInv), furniture_inventory: JSON.stringify(furnInv) }).eq('char_id', myCharId).eq('phase', 0);
        if (updateErr) throw updateErr;

        alert(`[완료] [${nameInput}] 가구가 완성되었습니다!\n마이룸의 [보관함] 탭에서 확인하세요.`);
        
        const diyModal = document.getElementById('diy-modal');
        if (diyModal) { diyModal.style.display = 'none'; diyModal.classList.remove('show'); }
        
        // 만약 내 방을 꾸미고 있던 중이었다면, 보관함 목록을 바로 새로고침해줍니다.
        if (typeof MyRoomSys !== 'undefined' && MyRoomSys.isEditMode) { MyRoomSys._loadInventory(); }

    } catch (e) {
        console.error(e); alert('가구 제작 중 오류: ' + e.message);
    } finally {
        btn.disabled = false; btn.innerText = '가구 제작하기 (생성권 1개 소모)';
    }
};