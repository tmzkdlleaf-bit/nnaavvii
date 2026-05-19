/* ================================================================= */
/*  Combat.js — 대련장(전투장) 핵심 시스템 논리 파일                   */
/*  초보자 안내: 이 파일은 주사위를 굴려서 공격이 성공했는지 판정하고,     */
/*  체력을 깎고, 화면의 체력바를 줄어들게 만드는 등 전투의 모든 규칙을    */
/*  담당하는 '두뇌' 역할을 합니다. (자동차 운전은 회피용으로만 씁니다.)    */
/* ================================================================= */

(function () {
    'use strict'; // 코드를 엄격하게 관리하여 실수를 줄여주는 모드입니다.

    // 캐릭터 얼굴 이미지가 없을 때 보여줄 기본(회색) 이미지 주소입니다.
    const PLACEHOLDER_100 = "https://placehold.co/100x100/3a3a36/d7b33d?text=No+Img";

    // 전투 시스템의 모든 정보와 기능을 담아두는 커다란 보관함입니다.
    const CombatSys = {
        mode:            'solo', // 현재 모드 (solo: 단일전, team: 팀전)
        arenaChannel:    null,   // 다른 사람들과 실시간으로 연결되는 통신 채널
        myRole:          'spectator', // 내 역할 (p1, p2, 혹은 관전자)
        lobbyInterval:   null,   // 로비(대기실) 화면을 주기적으로 새로고침하는 타이머
        _latestCombat:   null,   // 가장 최근에 받아온 단일전 전투 데이터
        _latestTeam:     null,   // 가장 최근에 받아온 팀전 전투 데이터
        currentCombatId: null,   // 현재 참여 중인 단일전 방 번호
        isDummyPractice: false,  // 혼자 목인장(허수아비)을 때리는 연습 모드인지 여부
        _dummyCombat:    null,   // 연습 모드용 가짜 전투 데이터
        currentTeamId:   null,   // 현재 참여 중인 팀전 방 번호
        myTeam:          null,   // 내가 팀전에서 속한 팀 (a팀 또는 b팀)
        _teamBuilderA:   [],     // 팀전 시작 전, A팀에 넣을 사람 목록
        _teamBuilderB:   [],     // 팀전 시작 전, B팀에 넣을 사람 목록

        // 혼자 연습할 때 사용할 허수아비(목인장)들의 난이도별 능력치 설정입니다.
        DUMMY_PRESETS: [
            { name:'목인장(쉬움)',    hp:6,  maxHp:6,  mp:5,  maxMp:5,  bp:10, maxBp:10, str:40,con:50,siz:50,dex:40, skills:{brawl:25,sword:25,bow:25,throw:20,magic:15,dodge:20,drive:20},  db:{dice:0,mod:0,label:'없음'},  weapons:[{name:'나무 주먹',dmg:'1d3',type:'brawl'}], img:'https://placehold.co/100x100/3a3a36/d7b33d?text=Dummy' },
            { name:'목인장(보통)',    hp:9,  maxHp:9,  mp:8,  maxMp:8,  bp:20, maxBp:20, str:60,con:65,siz:65,dex:55, skills:{brawl:50,sword:50,bow:50,throw:40,magic:30,dodge:40,drive:40},  db:{dice:0,mod:0,label:'없음'},  weapons:[{name:'나무 주먹',dmg:'1d4',type:'brawl'}], img:'https://placehold.co/100x100/3a3a36/d7b33d?text=Dummy' },
            { name:'목인장(어려움)', hp:13, maxHp:13, mp:15, maxMp:15, bp:30, maxBp:30, str:80,con:80,siz:75,dex:70, skills:{brawl:70,sword:70,bow:70,throw:60,magic:50,dodge:60,drive:60},  db:{dice:4,mod:0,label:'+1d4'}, weapons:[{name:'나무 주먹',dmg:'1d6',type:'brawl'}], img:'https://placehold.co/100x100/3a3a36/d7b33d?text=Dummy' }
        ],

        // ─────────────────────────────────────────────────────────────────
        // 1. 주사위 및 데미지 계산 기능 모음
        // ─────────────────────────────────────────────────────────────────
        
        // 1~100까지의 100면체 주사위를 굴려서 성공/실패 등급을 판정하는 함수입니다.
        _roll(skill) {
            const roll = Math.floor(Math.random() * 100) + 1; // 1부터 100까지 무작위 숫자 뽑기
            const ex = Math.floor(skill / 5), hd = Math.floor(skill / 2), fumble = skill < 50 ? 96 : 100;
            
            // 주사위 결과에 따라 대성공, 대실패, 보통 성공 등을 나눕니다.
            if (roll === 1)       return { roll, grade: 4, label: '대성공!',       color: '#ffd700' };
            if (roll >= fumble)   return { roll, grade: -1, label: '대실패…',       color: '#ff4d4d' };
            if (roll <= ex)       return { roll, grade: 3, label: '극단적 성공',   color: '#4caf50' };
            if (roll <= hd)       return { roll, grade: 2, label: '어려운 성공',   color: '#4c8bf5' };
            if (roll <= skill)    return { roll, grade: 1, label: '보통 성공',      color: 'var(--text-main)' };
            return                       { roll, grade: 0, label: '실패',            color: '#888' };
        },

        // 근력(STR)과 덩치(SIZ)를 합쳐서 추가 데미지(피해량 보너스)를 계산하는 함수입니다.
        _damageBonus(str, siz) {
            const s = str + siz;
            if (s <= 64)  return { dice: 0, mod: -2, label: '-2' };
            if (s <= 84)  return { dice: 0, mod: -1, label: '-1' };
            if (s <= 124) return { dice: 0, mod:  0, label: '없음' };
            if (s <= 164) return { dice: 4, mod:  0, label: '+1d4' }; // 4면체 주사위 1개 추가
            if (s <= 204) return { dice: 6, mod:  0, label: '+1d6' }; // 6면체 주사위 1개 추가
            return               { dice: 6, mod:  4, label: '+2d6' }; // 6면체 주사위 2개 추가
        },

        // '1d3', '1d6+1' 처럼 적힌 무기 데미지 글자를 보고 실제로 피해량 숫자를 뽑아내는 함수입니다.
        _rollDmg(dmgStr, maxRoll = false) {
            const m = String(dmgStr).toLowerCase().match(/(\d+)d(\d+)([+-]\d+)?/);
            // 글자 형식이 이상하면 그냥 기본(최대 3) 데미지를 줍니다.
            if (!m) return maxRoll ? 3 : Math.floor(Math.random() * 3) + 1;
            
            const cnt = parseInt(m[1]), sid = parseInt(m[2]), bon = m[3] ? parseInt(m[3]) : 0;
            // 크리티컬(대성공)일 때는 주사위를 굴리지 않고 최대 데미지를 확정으로 꽂아넣습니다.
            if (maxRoll) return (cnt * sid) + bon;
            
            let t = bon;
            for (let i = 0; i < cnt; i++) t += Math.floor(Math.random() * sid) + 1;
            return t; // 최종 데미지 반환
        },

        // 데이터베이스에서 캐릭터 스탯과 무기 정보를 싹 긁어와서 전투용 규격으로 조립하는 함수입니다.
        _buildCharData(charId) {
            const profile = allProfiles.find(p => p.char_id === charId && p.phase === 0);
            const base    = charData.find(c => `char-${c.id}` === charId);
            const st      = ((profile?.stats) || base?.stats || '50,50,50,50,50,50,50,50').split(',').map(Number);
            const str = st[0]||50, con = st[1]||50, siz = st[2]||50, dex = st[3]||50, pow = st[6]||50;
            
            // 체력과 마력의 최대치(Max)를 정해줍니다.
            const maxHp = Math.round((con + siz) / 10), maxMp = Math.floor(pow / 5);
            let maxBp = pow;
            
            // 기본 무기 기능치들을 셋팅합니다.
            let b = 25, s = 25, bw = 25, t = 20, m = 15, do_ = dex * 2, dr = 20, weapons = [];
            if (profile?.weapon_data) {
                try {
                    const w = JSON.parse(profile.weapon_data);
                    b = w.brawl||25; s = w.sword||25; bw = w.bow||25; t = w.throw||20;
                    m = w.magic||15; do_ = w.dodge||(dex*2); dr = w.drive||20; weapons = w.weapons||[];
                    if (w.bp && w.bp > 0) maxBp = w.bp;
                } catch(e) {}
            }
            return {
                id: charId, name: base?.name || charId,
                img: profile?.combat_img || profile?.profile_image || base?.img || PLACEHOLDER_100,
                hp: maxHp, maxHp, mp: maxMp, maxMp, bp: maxBp, maxBp, str, con, siz, dex,
                skills: { brawl: b, sword: s, bow: bw, throw: t, magic: m, dodge: do_, drive: dr },
                db: this._damageBonus(str, siz), weapons,
                alive: true, fled: false, skipTurn: false
            };
        },

        // 팀전에서 이 캐릭터가 살아있는지, 어느 팀인지 찾아내는 보조 함수들입니다.
        _findMember(tc, charId) { return [...(tc.team_a||[]), ...(tc.team_b||[])].find(m => m.id === charId); },
        _teamDead(members)       { return members.every(m => !m.alive || m.fled); },

        // 타격을 입었을 때 빨갛게 번쩍이고 숫자가 떠오르게 하는 화면 연출(이펙트) 함수입니다.
        _hitEffect(charId, damage) {
            const card = document.querySelector(`.combatant-card[data-id="${charId}"]`);
            if (!card) return;
            // 애니메이션을 껐다가 다시 켜서 확실하게 재생되게 합니다.
            card.classList.remove('hit'); void card.offsetWidth; card.classList.add('hit');
            setTimeout(() => card.classList.remove('hit'), 600);
            
            // 데미지 숫자 팝업 띄우기
            const popup = document.createElement('div');
            popup.className = 'dmg-popup'; popup.textContent = `-${damage}`;
            card.appendChild(popup); setTimeout(() => popup.remove(), 1100);
        },
        
        // 체력이 0이 되어 쓰러질 때의 화면 연출 함수입니다.
        _deathEffect(charId) {
            const card = document.querySelector(`.combatant-card[data-id="${charId}"]`);
            if (card) { card.classList.add('dying'); setTimeout(() => card.classList.add('dead'), 900); }
        },

        // ─────────────────────────────────────────────────────────────────
        // 2. 대기실(로비) 화면 및 입장 기능
        // ─────────────────────────────────────────────────────────────────
        
        // 단일전과 팀전 대기실 화면을 탭으로 왔다갔다 전환해주는 함수입니다.
        switchMode(mode) {
            this.mode = mode;
            document.querySelectorAll('.combat-mode-btn').forEach(b => b.classList.remove('active'));
            document.querySelector(`.combat-mode-btn[data-mode="${mode}"]`)?.classList.add('active');
            
            document.getElementById('lobby-solo').style.display = mode === 'solo' ? '' : 'none';
            document.getElementById('lobby-team').style.display = mode === 'team' ? '' : 'none';
            
            const soloStage = document.getElementById('solo-arena-stage');
            const teamStage = document.getElementById('team-arena-stage');
            if (soloStage) soloStage.style.display = mode === 'solo' ? '' : 'none';
            if (teamStage) teamStage.style.display  = mode === 'team' ? '' : 'none';
            
            // 모드에 맞춰서 대기실 정보를 서버에서 다시 불러옵니다.
            if (mode === 'team') this._renderTeamLobby(); else this.loadLobby();
        },

        // 누구와 대련할지 고르는 선택 목록(드롭다운)을 채워주는 함수입니다.
        initDropdowns() {
            if (!currentUser || !supabaseClient) return;
            const sel = document.getElementById('spar-target'); if (!sel) return;
            const myCharId = charOwners[currentUser.email];
            
            sel.innerHTML = '<option value="">대련 상대를 선택하세요</option>';
            
            // [실제 사람 목록]
            const rg = document.createElement('optgroup'); rg.label = '[실제 대련]';
            [...charData].sort((a, b) => parseInt(a.id.replace(/\D/g,'')) - parseInt(b.id.replace(/\D/g,''))).forEach(c => {
                if (`char-${c.id}` !== myCharId) {
                    const o = document.createElement('option'); o.value = `char-${c.id}`; o.innerText = `${c.name}에게 신청`; rg.appendChild(o);
                }
            });
            sel.appendChild(rg);
            
            // [목인장 연습 목록]
            const dg = document.createElement('optgroup'); dg.label = '[연습 대련 (허수아비)]';
            this.DUMMY_PRESETS.forEach((p, i) => {
                const o = document.createElement('option'); o.value = `dummy_${i}`; o.innerText = `[연습] ${p.name}`; dg.appendChild(o);
            });
            sel.appendChild(dg);
            
            this.loadLobby(); this._startLobbyWatch();
        },

        // 누군가 나에게 대련을 신청했는지 실시간으로 서버를 감시하는 함수입니다.
        _lobbyChannel: null,
        _startLobbyWatch() {
            if (this.lobbyInterval) { clearInterval(this.lobbyInterval); this.lobbyInterval = null; }
            if (this._lobbyChannel) { try { supabaseClient.removeChannel(this._lobbyChannel); } catch(e) {} this._lobbyChannel = null; }
            if (!currentUser || !supabaseClient) return;
            
            const myCharId = charOwners[currentUser.email];
            
            // 3초마다 화면을 새로고침하여 대련 목록을 최신화합니다.
            this.lobbyInterval = setInterval(() => {
                const arena = document.getElementById('sparring-arena');
                if (arena && arena.style.display !== 'none') return; // 이미 싸우고 있으면 새로고침 안 함
                if (this.mode === 'solo') this.loadLobby(); else this._renderTeamLobby();
            }, 3000);
            
            // 실시간 통신망을 열어 누가 방을 파면 바로 감지해서 끌고 들어갑니다.
            this._lobbyChannel = supabaseClient.channel('lobby-watch-all')
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'combats' }, payload => {
                    if ((payload.new.p1_id === myCharId || payload.new.p2_id === myCharId) && payload.new.status === 'ongoing') {
                        if (this.currentCombatId !== payload.new.id && !this.isDummyPractice) {
                            const arena = document.getElementById('sparring-arena');
                            if (!arena || arena.style.display === 'none') this.joinArena(payload.new.id);
                        }
                    }
                }).subscribe();
        },
        _stopLobbyWatch() {
            // 감시(새로고침)를 끕니다. (보통 투기장에 입장했을 때 끕니다)
            if (this.lobbyInterval) { clearInterval(this.lobbyInterval); this.lobbyInterval = null; }
            if (this._lobbyChannel) { try { supabaseClient.removeChannel(this._lobbyChannel); } catch(e) {} this._lobbyChannel = null; }
        },

        // 서버에서 대기/진행 중인 단일전 방 목록을 가져와서 화면에 그려주는 함수입니다.
        async loadLobby() {
            if (!supabaseClient || !currentUser) return;
            const myCharId = charOwners[currentUser.email];
            const { data: combats } = await supabaseClient.from('combats').select('*').in('status', ['waiting','ongoing']).order('created_at', { ascending: false });
            
            const inB = document.getElementById('spar-incoming-requests');
            const onB = document.getElementById('spar-ongoing-list');
            if (!inB || !onB) return;
            
            const nm = {}; charData.forEach(c => { nm[`char-${c.id}`] = c.name; });
            let inH = '', onH = '';
            
            (combats || []).forEach(c => {
                const p1 = nm[c.p1_id] || c.p1_id, p2 = nm[c.p2_id] || c.p2_id;
                if (c.status === 'waiting') {
                    if (c.p2_id === myCharId) // 나한테 온 신청
                        inH += `<div class="lobby-card incoming-card"><span class="card-info">[도전] <span>${p1}</span> 님의 신청</span><button class="lobby-action-btn btn-accept" onclick="CombatSys.acceptChallenge('${c.id}')">수락</button></div>`;
                    else if (c.p1_id === myCharId) // 내가 보낸 신청
                        inH += `<div class="lobby-card sent-request-card"><span class="card-info">[대기] <span>${p2}</span> 님에게 신청 중</span><button class="lobby-action-btn btn-cancel" onclick="CombatSys.cancelChallenge('${c.id}')">취소</button></div>`;
                } else if (c.status === 'ongoing') { // 이미 싸우고 있는 방
                    onH += `<div class="lobby-card ongoing-card"><span class="card-info">[진행] ${p1} VS ${p2}</span><button class="lobby-action-btn btn-spectate" onclick="CombatSys.joinArena('${c.id}')">관전</button></div>`;
                }
            });
            const em = (text) => `<div class="lobby-empty-card"><p>${text}</p></div>`;
            inB.innerHTML = inH || em('도착한 신청이 없습니다');
            onB.innerHTML = onH || em('진행 중인 대련이 없습니다');
        },

        // '신청' 버튼을 누르면 서버에 새로운 대기 방을 파는 함수입니다.
        async challenge() {
            if (!currentUser) return alert('로그인이 필요합니다.');
            const selVal = document.getElementById('spar-target')?.value;
            if (!selVal) return alert('대련 상대를 선택하세요.');
            
            // 연습용 목인장을 골랐다면 진짜 방을 안 파고 혼자 노는 연습 모드로 갑니다.
            if (selVal.startsWith('dummy_')) { this.startDummyPractice(parseInt(selVal.replace('dummy_', ''))); return; }
            
            const myCharId = charOwners[currentUser.email];
            const p1data = this._buildCharData(myCharId), p2data = this._buildCharData(selVal);
            
            const { error } = await supabaseClient.from('combats').insert([{
                p1_id: myCharId, p2_id: selVal, status: 'waiting', combat_phase: 'initiative',
                attacker_id: null, round: 1, chosen_weapon: null, attack_roll: null,
                p1_data: p1data, p2_data: p2data, spectators: [], bets: { p1: [], p2: [] },
                log: [`[시작] <b>${p1data.name}</b> vs <b>${p2data.name}</b> 개인전 신청!`]
            }]);
            if (error) { console.error(error); return alert('신청 실패'); }
            alert('신청 완료!'); this.loadLobby();
        },
        // 신청한 거 물리기
        async cancelChallenge(id) { if (!confirm('취소하시겠습니까?')) return; await supabaseClient.from('combats').delete().eq('id', id); this.loadLobby(); },
        // 신청받은 거 수락하고 투기장 들어가기
        async acceptChallenge(id) { await supabaseClient.from('combats').update({ status: 'ongoing' }).eq('id', id); this.joinArena(id); },

        // ─────────────────────────────────────────────────────────────
        // 3. 팀전 로비 및 방 만들기
        // ─────────────────────────────────────────────────────────────
        _renderTeamLobby() {
            const lb = document.getElementById('team-lobby-area'); if (!lb) return;
            if (lb.querySelector('#team-a-slots')) { this._loadTeamOngoing(); return; }
            this._teamBuilderA = []; this._teamBuilderB = [];
            
            lb.innerHTML = `
            <div class="team-builder-wrap">
                <div class="team-builder-grid">
                    <div class="team-col team-col-a">
                        <div class="team-col-header"><span class="team-dot" style="background:#ff4d4d;"></span><span class="team-col-title">팀 A</span></div>
                        <div id="team-a-slots" class="team-slot-list"></div>
                        <button class="team-add-btn" onclick="CombatSys._addToTeam('a')">+ 팀원 추가</button>
                    </div>
                    <div class="team-col-divider">VS</div>
                    <div class="team-col team-col-b">
                        <div class="team-col-header"><span class="team-dot" style="background:#4c8bf5;"></span><span class="team-col-title">팀 B</span></div>
                        <div id="team-b-slots" class="team-slot-list"></div>
                        <button class="team-add-btn" onclick="CombatSys._addToTeam('b')">+ 팀원 추가</button>
                    </div>
                </div>
                <button class="team-start-btn" onclick="CombatSys.createTeamBattle()">팀전 시작</button>
            </div>
            <div class="team-section-divider"></div>
            <div class="lobby-list-label">진행 중인 팀전</div>
            <div id="team-ongoing-list" class="lobby-list-area" style="margin-top:8px;"></div>`;
            this._renderTeamSlots(); this._loadTeamOngoing();
        },
        
        // 팀에 사람 넣기 팝업 띄우기
        _addToTeam(side) {
            const used = [...this._teamBuilderA, ...this._teamBuilderB];
            const available = charData.filter(c => !used.includes(`char-${c.id}`)); // 이미 고른 사람은 제외
            if (!available.length) return alert('추가할 캐릭터가 없습니다.');
            
            const old = document.getElementById('team-pick-modal'); if (old) old.remove();
            const modal = document.createElement('div');
            modal.id = 'team-pick-modal';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:99999;display:flex;align-items:center;justify-content:center;';
            modal.innerHTML = `
                <div style="background:#1a1817;border:1px solid rgba(229,197,109,0.4);border-radius:12px;padding:28px;min-width:280px;max-width:90vw;">
                    <h4 style="color:var(--accent-color);margin:0 0 16px;">팀 ${side.toUpperCase()}에 추가</h4>
                    <select id="team-pick-sel" style="width:100%;padding:10px;background:#111;color:#fff;border:1px solid #444;border-radius:6px;margin-bottom:16px;">
                        ${available.map(c => `<option value="char-${c.id}">${c.name}</option>`).join('')}
                    </select>
                    <div style="display:flex;gap:10px;">
                        <button onclick="CombatSys._confirmAddToTeam('${side}')" style="flex:1;padding:10px;background:var(--accent-color);color:#111;border:none;border-radius:6px;font-weight:bold;cursor:pointer;">추가</button>
                        <button onclick="document.getElementById('team-pick-modal').remove()" style="flex:1;padding:10px;background:#333;color:#aaa;border:1px solid #555;border-radius:6px;cursor:pointer;">취소</button>
                    </div>
                </div>`;
            document.body.appendChild(modal);
            modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
        },
        _confirmAddToTeam(side) {
            const sel = document.getElementById('team-pick-sel'); if (!sel || !sel.value) return;
            if (side === 'a') this._teamBuilderA.push(sel.value); else this._teamBuilderB.push(sel.value);
            document.getElementById('team-pick-modal')?.remove(); this._renderTeamSlots();
        },
        _removeFromTeam(side, idx) {
            if (side === 'a') this._teamBuilderA.splice(idx, 1); else this._teamBuilderB.splice(idx, 1);
            this._renderTeamSlots();
        },
        // 구성 중인 팀원 목록 다시 그리기
        _renderTeamSlots() {
            const nm = {}; charData.forEach(c => { nm[`char-${c.id}`] = c.name; });
            const getImg = id => {
                const p = allProfiles.find(x => x.char_id === id && x.phase === 0);
                const b = charData.find(c => `char-${c.id}` === id);
                return p?.combat_img || p?.profile_image || b?.img || PLACEHOLDER_100;
            };
            const render = (ids, side) => ids.length
                ? ids.map((id, i) => `<div class="team-member-card"><img src="${getImg(id)}" class="team-member-img" onerror="this.src='${PLACEHOLDER_100}'"><span class="team-member-name">${nm[id]||id}</span><button class="team-member-remove" onclick="CombatSys._removeFromTeam('${side}',${i})">✕</button></div>`).join('')
                : `<div class="team-slot-empty">아직 없음</div>`;
            const sA = document.getElementById('team-a-slots'); if (sA) sA.innerHTML = render(this._teamBuilderA, 'a');
            const sB = document.getElementById('team-b-slots'); if (sB) sB.innerHTML = render(this._teamBuilderB, 'b');
        },
        
        async _loadTeamOngoing() {
            const ol = document.getElementById('team-ongoing-list'); if (!ol || !supabaseClient) return;
            const { data } = await supabaseClient.from('team_combats').select('id,team_a,team_b,status').eq('status','ongoing').order('created_at',{ascending:false});
            const nm = {}; charData.forEach(c => { nm[`char-${c.id}`] = c.name; });
            if (!data || !data.length) {
                ol.innerHTML = `<div class="lobby-empty-card"><p>진행 중인 팀전이 없습니다</p></div>`;
                return;
            }
            ol.innerHTML = data.map(tc => {
                const aN = (tc.team_a||[]).map(m => nm[m.id]||m.id).join(', ');
                const bN = (tc.team_b||[]).map(m => nm[m.id]||m.id).join(', ');
                return `<div class="lobby-card ongoing-card"><span class="card-info" style="flex-direction:column;align-items:flex-start;gap:4px;"><span>[팀A] ${aN}</span><span>[팀B] ${bN}</span></span><button class="lobby-action-btn btn-spectate" onclick="CombatSys.joinTeamArena('${tc.id}')">관전</button></div>`;
            }).join('');
        },

        // '팀전 시작'을 누르면 DB에 팀전 방을 새로 파고 접속하는 함수입니다.
        async createTeamBattle() {
            if (!currentUser) return alert('로그인이 필요합니다.');
            if (!this._teamBuilderA.length || !this._teamBuilderB.length) return alert('팀 A와 팀 B에 각 1명 이상 추가하세요.');
            
            const teamA = this._teamBuilderA.map(id => { const d = this._buildCharData(id); d.team = 'a'; return d; });
            const teamB = this._teamBuilderB.map(id => { const d = this._buildCharData(id); d.team = 'b'; return d; });
            
            const { data, error } = await supabaseClient.from('team_combats').insert([{
                status: 'ongoing', combat_phase: 'initiative',
                team_a: teamA, team_b: teamB,
                turn_order: [], current_turn_idx: 0,
                attacker_id: null, target_id: null, chosen_weapon: null, attack_roll: null,
                spectators: [], bets: { a: [], b: [] },
                log: [`[공지] 팀전 시작!`, `[팀A] : ${teamA.map(m=>m.name).join(', ')}`, `[팀B] : ${teamB.map(m=>m.name).join(', ')}`, `순서 결정(DEX) 판정 중...`]
            }]).select().single();
            
            if (error) { console.error(error); return alert('팀전 생성 실패'); }
            await this.joinTeamArena(data.id, true);
        },

        // ─────────────────────────────────────────────────────────────────
        // 4. 투기장 입장 및 실시간 화면 갱신
        // ─────────────────────────────────────────────────────────────────
        
        // 단일전 투기장에 입장하는 함수입니다.
        async joinArena(combatId) {
            if (!currentUser) return alert('로그인이 필요합니다.');
            this._stopLobbyWatch(); // 대기실 새로고침 끄기
            
            this.mode = 'solo'; this.isDummyPractice = false; this.currentCombatId = combatId; this.currentTeamId = null;
            const myCharId = charOwners[currentUser.email];
            
            // DB에서 현재 투기장 데이터 가져오기
            const { data: combat, error } = await supabaseClient.from('combats').select('*').eq('id', combatId).single();
            if (error || !combat) return alert('대련 정보를 찾을 수 없거나 파기되었습니다.');
            
            this._latestCombat = combat;
            
            // 내가 싸우는 사람인지(p1, p2) 구경꾼인지 역할 정하기
            if (combat.p1_id === myCharId)      this.myRole = 'p1';
            else if (combat.p2_id === myCharId) this.myRole = 'p2';
            else                                this.myRole = 'spectator';
            
            // 구경꾼이면 방명록(spectators)에 내 이름 적어두기
            if (this.myRole === 'spectator') {
                const myName = charData.find(c => `char-${c.id}` === myCharId)?.name || myCharId;
                const specs = [...(combat.spectators || [])];
                if (!specs.includes(myName)) { specs.push(myName); await supabaseClient.from('combats').update({ spectators: specs }).eq('id', combatId); }
            }
            
            // ★ 여기서부터 가장 중요: 실시간 통신망을 엽니다!
            // 누군가 때리거나 맞아서 DB 내용이 바뀌면(UPDATE), 내 화면도 즉시 똑같이 바꿔줍니다.
            if (this.arenaChannel) { try { supabaseClient.removeChannel(this.arenaChannel); } catch(e) {} this.arenaChannel = null; }
            this.arenaChannel = supabaseClient.channel(`arena-${combatId}`)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'combats', filter: `id=eq.${combatId}` }, payload => { this._latestCombat = payload.new; this.updateArenaUI(payload.new); })
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'combats', filter: `id=eq.${combatId}` }, () => { alert('대련방이 폭파되어 로비로 돌아갑니다.'); this.forceExitArena(); })
                .subscribe();
            
            // 화면 껍데기를 투기장에 맞게 싹 정리해서 보여줍니다.
            const arena = document.getElementById('sparring-arena'); if (arena) arena.style.display = 'flex';
            const soloStage = document.getElementById('solo-arena-stage'), teamStage = document.getElementById('team-arena-stage');
            if (soloStage) soloStage.style.display = ''; if (teamStage) teamStage.style.display = 'none';
            const fleeBtn = document.querySelector('.btn-flee'); if (fleeBtn) fleeBtn.innerText = '대련 포기 (방 폭파)';
            
            this._renderMyMoney(); this.updateArenaUI(combat);
        },

        // 팀전 투기장에 입장하는 함수입니다. (단일전과 원리가 비슷합니다)
        async joinTeamArena(teamCombatId, isCreator = false) {
            if (!currentUser) return alert('로그인이 필요합니다.');
            this._stopLobbyWatch();
            this.mode = 'team'; this.currentTeamId = teamCombatId; this.currentCombatId = null; this.isDummyPractice = false;
            
            const { data: tc, error } = await supabaseClient.from('team_combats').select('*').eq('id', teamCombatId).single();
            if (error || !tc) return alert('팀전 정보를 찾을 수 없거나 파기되었습니다.');
            
            this._latestTeam = tc;
            const myCharId = charOwners[currentUser.email];
            if      ((tc.team_a||[]).some(m => m.id === myCharId)) { this.myTeam = 'a'; this.myRole = 'a'; }
            else if ((tc.team_b||[]).some(m => m.id === myCharId)) { this.myTeam = 'b'; this.myRole = 'b'; }
            else                                                   { this.myTeam = 'spectator'; this.myRole = 'spectator'; }
            
            if (this.arenaChannel) { try { supabaseClient.removeChannel(this.arenaChannel); } catch(e) {} this.arenaChannel = null; }
            this.arenaChannel = supabaseClient.channel(`team-arena-${teamCombatId}`)
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'team_combats', filter: `id=eq.${teamCombatId}` }, payload => { this._latestTeam = payload.new; this.updateTeamArenaUI(payload.new); })
                .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'team_combats', filter: `id=eq.${teamCombatId}` }, () => { alert('팀전 방이 폭파되어 로비로 돌아갑니다.'); this.forceExitArena(); })
                .subscribe();
            
            const arena = document.getElementById('sparring-arena'); if (arena) arena.style.display = 'flex';
            const soloStage = document.getElementById('solo-arena-stage'), teamStage = document.getElementById('team-arena-stage');
            if (soloStage) soloStage.style.display = 'none'; if (teamStage) teamStage.style.display = '';
            const fleeBtn = document.querySelector('.btn-flee'); if (fleeBtn) fleeBtn.innerText = '대련 포기 (방 폭파)';
            
            this._renderMyMoney(); this.updateTeamArenaUI(tc);
            // 방장이라면 순서 정하기 주사위를 여기서 한 번 굴려줍니다.
            if (isCreator && tc.combat_phase === 'initiative') await this._rollTeamInitiative(tc);
        },

        // 목인장(허수아비) 혼자 치기 연습 모드 켜기
        startDummyPractice(presetIdx) {
            this._stopLobbyWatch();
            this.mode = 'solo'; this.isDummyPractice = true; this.currentCombatId = null; this.currentTeamId = null; this.myRole = 'p1';
            
            const myCharId = charOwners[currentUser.email], myData = this._buildCharData(myCharId);
            const dummy = JSON.parse(JSON.stringify(this.DUMMY_PRESETS[presetIdx]));
            dummy.id = 'char-dummy'; dummy.alive = true; dummy.fled = false; dummy.skipTurn = false;
            
            // DB에 저장 안 하고 내 컴퓨터(브라우저 메모리)에만 가짜 전투 데이터를 만들어둡니다.
            this._dummyCombat = {
                id: 'dummy', p1_id: myCharId, p2_id: 'char-dummy', status: 'ongoing', combat_phase: 'initiative',
                attacker_id: null, round: 1, chosen_weapon: null, attack_roll: null,
                p1_data: myData, p2_data: dummy, spectators: [], bets: { p1: [], p2: [] },
                log: [`[안내] <b>${myData.name}</b> vs <b>${dummy.name}</b>`, `연습 대련 시작!`]
            };
            
            const arena = document.getElementById('sparring-arena'); if (arena) arena.style.display = 'flex';
            const soloStage = document.getElementById('solo-arena-stage'), teamStage = document.getElementById('team-arena-stage');
            if (soloStage) soloStage.style.display = ''; if (teamStage) teamStage.style.display = 'none';
            const fleeBtn = document.querySelector('.btn-flee'); if (fleeBtn) fleeBtn.innerText = '[종료] 대련 종료';
            
            this._renderMyMoney(); this.updateArenaUI(this._dummyCombat);
        },

        // 허수아비(컴퓨터)가 알아서 공격하고 방어하게 돕는 인공지능 보조 함수
        async executeDummyAI(data) {
            if (!this.isDummyPractice) return;
            await new Promise(r => setTimeout(r, 900)); // 너무 빠르면 안 보이니까 0.9초 뜸 들이기
            
            const phase = data.combat_phase;
            if (phase === 'initiative')                                      await this.rollInitiative();
            else if (phase === 'attack'  && data.attacker_id === 'char-dummy')      await this._dummyRollAttack();
            else if (phase === 'defense' && data.attacker_id !== 'char-dummy')      await this._dummyRollDefense(Math.random() > 0.5 ? 'dodge' : 'counter');
        },
        
        // 허수아비가 내 캐릭터를 때리는 로직
        async _dummyRollAttack() {
            const data = this._dummyCombat, dummy = data.p2_data;
            const w = dummy.weapons[0] || { name: '나무 주먹', dmg: '1d3', type: 'brawl' };
            const weapon = { name: w.name, dmg: w.dmg, type: w.type, skill: dummy.skills[w.type] || dummy.skills.brawl };
            
            const result = this._roll(weapon.skill), logs = [...data.log];
            logs.push(`[공격] <b>${dummy.name}</b> [${weapon.name}] 주사위:${result.roll} → <span style="color:${result.color}">${result.label}</span>`);
            
            let updates;
            if (result.grade === 4) {
                logs.push(`<span style="color:#ffd700;font-weight:bold;">대성공!</span> 방어 불가!`);
                updates = await this._applyDamage(data, 'char-dummy', weapon, result, logs, true, false);
            } else if (result.grade <= 0) {
                logs.push(result.grade === 0 ? `빗나감.` : `대실패…`);
                updates = this._nextTurn(data, logs); // 빗나갔으니 턴 넘김
            } else {
                logs.push(`[${data.p1_data.name}의 차례] 회피 또는 반격을 선택하세요.`);
                updates = { combat_phase: 'defense', chosen_weapon: weapon, attack_roll: { roll: result.roll, grade: result.grade, gradeLabel: result.label, gradeColor: result.color } };
            }
            await this._updateCombat({ ...updates, log: logs });
        },
        
        // 허수아비가 내 공격에 반응하여 회피나 반격을 하는 로직
        async _dummyRollDefense(type) {
            const data = this._dummyCombat, dummy = data.p2_data;
            const attWeap = data.chosen_weapon || { name: '맨손', dmg: '1d3', type: 'brawl' }, attRoll = data.attack_roll || { grade: 1 };
            const skillVal = type === 'dodge' ? dummy.skills.dodge : dummy.skills[attWeap.type] || dummy.skills.brawl;
            const label = type === 'dodge' ? '회피' : '반격';
            
            const result = this._roll(skillVal), logs = [...data.log];
            logs.push(`[${label}] <b>${dummy.name}</b> 주사위:${result.roll} → <span style="color:${result.color}">${result.label}</span>`);
            
            const attGrade = attRoll.grade || 0, defGrade = result.grade, isAttEx = attGrade >= 3;
            let updates = {};
            if (type === 'dodge') {
                if (defGrade > 0 && defGrade >= attGrade) { logs.push(`회피 성공!`); Object.assign(updates, this._nextTurn(data, logs)); }
                else { logs.push(`회피 실패!`); Object.assign(updates, await this._applyDamage(data, data.attacker_id, attWeap, attRoll, logs, isAttEx, attWeap.isBoost)); }
            } else {
                if (defGrade > attGrade) { logs.push(`반격 성공!`); Object.assign(updates, await this._applyDamage(data, 'char-dummy', { name:'반격', dmg:'1d3', type:'brawl' }, result, logs, defGrade >= 3, false)); }
                else if (defGrade === attGrade && defGrade > 0) {
                    logs.push(`반격 동률! 서로 맞습니다!`);
                    const res1 = await this._applyDamage(data, data.attacker_id, attWeap, attRoll, logs, isAttEx, attWeap.isBoost);
                    const res2 = await this._applyDamage({ ...data, ...res1 }, 'char-dummy', { name:'반격', dmg:'1d3', type:'brawl' }, result, logs, defGrade >= 3, false);
                    Object.assign(updates, res2);
                } else { logs.push(`반격 실패!`); Object.assign(updates, await this._applyDamage(data, data.attacker_id, attWeap, attRoll, logs, isAttEx, attWeap.isBoost)); }
            }
            await this._updateCombat({ ...updates, log: logs });
        },

        // 팀전 첫 시작 시, 모두가 순서 정하기용 민첩(DEX) 주사위를 굴려 순서를 쫙 세우는 함수입니다.
        async _rollTeamInitiative(tc) {
            const logs = [...(tc.log || [])];
            logs.push(`━━━━━ 팀전 순서 결정 ━━━━━`);
            const allMembers = [...(tc.team_a || []), ...(tc.team_b || [])];
            
            const turnOrder = allMembers.map(m => {
                const r = this._roll(m.dex || 50);
                logs.push(`[선공판정] <b>${m.name}</b> DEX(${m.dex||50}) 주사위:${r.roll} → <span style="color:${r.color}">${r.label}</span>`);
                return { id: m.id, name: m.name, team: m.team, grade: r.grade, roll: r.roll, dex: m.dex || 50 };
            }).sort((a, b) => {
                // 등급 높은 사람이 먼저, 등급 같으면 원본 DEX 높은 사람이 먼저!
                if (b.grade !== a.grade) return b.grade - a.grade;
                return b.dex - a.dex;
            });
            
            logs.push(`행동 순서: ${turnOrder.map(t => `<b>${t.name}</b>`).join(' → ')}`);
            const first = turnOrder[0];
            logs.push(`<b style="color:var(--accent-color)">${first.name}</b> 제일 먼저 시작합니다!`);
            
            // DB 업데이트
            await supabaseClient.from('team_combats').update({
                turn_order: turnOrder,
                current_turn_idx: 0,
                attacker_id: first.id,
                combat_phase: 'action',
                log: logs
            }).eq('id', tc.id);
        },

        // 단일전 투기장 화면에 숫자와 로그를 새로 써주는 렌더링 함수입니다.
        updateArenaUI(data) {
            if (!data) return;
            if (this.mode === 'team') { this.updateTeamArenaUI(data); return; }
            
            const p1 = data.p1_data || {}, p2 = data.p2_data || {};
            // 귀찮은 문서 작업(글씨 갈아끼우기)을 짧게 해주는 임시 도우미 함수
            const _s = (id, prop, val) => { const el = document.getElementById(id); if (el) { el[prop] = val; el.style.display = ''; } };

            _s('cb-p1-name', 'innerText', p1.name || 'P1');
            _s('cb-p2-name', 'innerText', p2.name || 'P2');
            _s('cb-p1-img',  'src',       p1.img   || PLACEHOLDER_100);
            _s('cb-p2-img',  'src',       p2.img   || PLACEHOLDER_100);

            // 게이지 바 퍼센트(%) 계산해서 막대 길이 조절하기
            _s('cb-p1-hp-txt', 'innerText', `HP ${Math.max(0, p1.hp ?? p1.maxHp)} / ${p1.maxHp}`);
            _s('cb-p2-hp-txt', 'innerText', `HP ${Math.max(0, p2.hp ?? p2.maxHp)} / ${p2.maxHp}`);
            const hp1 = document.getElementById('cb-p1-hp'); if (hp1) hp1.style.width = `${Math.max(0, ((p1.hp ?? p1.maxHp) / p1.maxHp) * 100)}%`;
            const hp2 = document.getElementById('cb-p2-hp'); if (hp2) hp2.style.width = `${Math.max(0, ((p2.hp ?? p2.maxHp) / p2.maxHp) * 100)}%`;

            _s('cb-p1-mp-txt', 'innerText', `MP ${Math.max(0, p1.mp ?? p1.maxMp)} / ${p1.maxMp}`);
            _s('cb-p2-mp-txt', 'innerText', `MP ${Math.max(0, p2.mp ?? p2.maxMp)} / ${p2.maxMp}`);
            const mp1 = document.getElementById('cb-p1-mp'); if (mp1) mp1.style.width = `${Math.max(0, ((p1.mp ?? p1.maxMp) / p1.maxMp) * 100)}%`;
            const mp2 = document.getElementById('cb-p2-mp'); if (mp2) mp2.style.width = `${Math.max(0, ((p2.mp ?? p2.maxMp) / p2.maxMp) * 100)}%`;

            _s('cb-p1-bp-txt', 'innerText', `법력 ${Math.max(0, p1.bp ?? p1.maxBp)} / ${p1.maxBp}`);
            _s('cb-p2-bp-txt', 'innerText', `법력 ${Math.max(0, p2.bp ?? p2.maxBp)} / ${p2.maxBp}`);
            const bp1 = document.getElementById('cb-p1-bp'); if (bp1) bp1.style.width = `${Math.max(0, ((p1.bp ?? p1.maxBp) / p1.maxBp) * 100)}%`;
            const bp2 = document.getElementById('cb-p2-bp'); if (bp2) bp2.style.width = `${Math.max(0, ((p2.bp ?? p2.maxBp) / p2.maxBp) * 100)}%`;

            // 관전자 명단 그리기
            const specs = data.spectators || [];
            const sc = document.getElementById('spectator-count'); if (sc) sc.innerText = specs.length;
            const sl = document.getElementById('spectator-list'); if (sl) sl.innerHTML = specs.map(n => `<span class="spectator-tag">[관전] ${n}</span>`).join('');
            
            // 돈 걸은(베팅) 사람들 명단 그리기
            const bets = data.bets || { p1: [], p2: [] };
            const rB = arr => (arr || []).map(b => `<span class="spectator-tag">${b.name} <b>${b.amount}G</b></span>`).join('');
            const p1B = document.getElementById('p1-bettors'); if (p1B) p1B.innerHTML = rB(bets.p1);
            const p2B = document.getElementById('p2-bettors'); if (p2B) p2B.innerHTML = rB(bets.p2);

            // 대화(로그)창 그리기 및 스크롤을 항상 맨 아래로 유지
            const logBox = document.getElementById('combat-log');
            if (logBox && data.log) { logBox.innerHTML = data.log.map(l => `<div>${l}</div>`).join(''); logBox.scrollTop = logBox.scrollHeight; }

            // 연습 모드라면, 허수아비 턴일 때 컴퓨터 AI가 돌도록 호출합니다.
            if (this.isDummyPractice && data.status === 'ongoing') {
                const isDT = (data.combat_phase === 'attack'  && data.attacker_id === 'char-dummy') ||
                             (data.combat_phase === 'defense' && data.attacker_id !== 'char-dummy') ||
                             (data.combat_phase === 'initiative');
                if (isDT) setTimeout(() => this.executeDummyAI(data), 1000);
            }
            
            // 버튼들(공격, 방어, 도주 등)을 현재 상황에 맞게 띄워주는 함수 호출
            this._renderActionPanel(data);
        },

        // 단일전 투기장 하단의 상황별 버튼들을 갈아끼우는 함수입니다.
        _renderActionPanel(data) {
            const box = document.getElementById('combat-actions'); if (!box) return;
            const phase = data.combat_phase, attackerId = data.attacker_id;
            const myCharId = currentUser ? charOwners[currentUser.email] : null;
            const p1 = data.p1_data || {}, p2 = data.p2_data || {};
            
            const myData     = (this.myRole === 'p1') ? p1 : p2;
            const isMe       = id => id === myCharId;
            const isAttacker = isMe(attackerId);
            const isPlayer   = (this.myRole === 'p1' || this.myRole === 'p2');
            const isDefender = isPlayer && !isAttacker && attackerId !== null;

            // 관전자용 화면
            if (this.myRole === 'spectator') {
                box.innerHTML = `<div style="text-align:center;color:#888;width:100%;">관전 중...<br><br><button class="combat-btn combat-btn-surrender" style="width:100%;" onclick="CombatSys.forceExitArena()">관전 종료</button></div>`;
                return;
            }
            
            // 승패가 나서 끝난 화면
            if (data.status === 'finished' || phase === 'finished') {
                box.innerHTML = `<div style="color:var(--accent-color);font-weight:bold;text-align:center;width:100%;padding:8px;">승패 결정!<br><br><button class="combat-btn combat-btn-dodge" style="width:100%;" onclick="CombatSys.forceExitArena()">대련장 나가기</button></div>`;
                return;
            }
            
            // 뭔가 이유로 턴을 건너뛰게 된 화면
            if (myData.skipTurn) {
                box.innerHTML = `<div style="text-align:center;color:#ff4d4d;font-weight:bold;width:100%;">턴을 소모하여 행동할 수 없습니다!</div>`;
                return;
            }

            // 1. 처음 시작 시 선공 잡기 주사위 굴리는 화면
            if (phase === 'initiative') {
                if (!attackerId && this.myRole === 'p1') { // 방장(p1)이 대표로 굴립니다.
                    box.innerHTML = `
                        <div style="background:rgba(20,20,20,0.8);border:1px solid rgba(215,179,61,0.3);border-radius:8px;padding:20px;box-sizing:border-box;width:100%;">
                            <div style="color:#d7b33d;text-align:center;font-size:1.1rem;font-weight:bold;margin-bottom:15px;letter-spacing:1px;">선공 판정</div>
                            <div style="color:#aaa;text-align:center;font-size:0.9rem;margin-bottom:15px;">DEX 대항 판정으로 선공을 결정합니다.</div>
                            <button class="combat-btn combat-btn-attack" style="width:100%;padding:14px;font-size:1.1rem;font-weight:bold;" onclick="CombatSys.rollInitiative()">주사위 굴리기</button>
                        </div>`;
                } else {
                    box.innerHTML = `<div style="text-align:center;color:#888;width:100%;padding:20px;">선공 판정 대기 중...</div>`;
                }
                return;
            }

            // 2. 공격해야 할 내 차례일 때 뜨는 메뉴 화면 (자동차 운전은 안 띄웁니다)
            if (phase === 'attack') {
                if (isAttacker) {
                    const sk = myData.skills || { brawl:25, sword:25, bow:25, throw:20, magic:15, drive:20 };
                    let wOpts = `<option value="__unarmed__">[격투] 맨손 격투 (1d3 / 기능치 ${sk.brawl}%)</option>`;
                    
                    (myData.weapons || []).forEach((w, i) => {
                        const wSkill   = sk[w.type] || sk.brawl;
                        const typeName = w.type==='sword'?'[도검]':w.type==='bow'?'[활]':w.type==='throw'?'[투척]':w.type==='magic'?'[도술]':'[격투]';
                        wOpts += `<option value="${i}">${typeName} ${w.name} (${w.dmg} / 기능치 ${wSkill}%)</option>`;
                    });
                    
                    box.innerHTML = `
                        <div style="display:flex;gap:15px;background:rgba(20,20,20,0.8);border:1px solid rgba(215,179,61,0.3);border-radius:8px;padding:15px;box-sizing:border-box;width:100%;">
                            <div style="flex:1;display:flex;flex-direction:column;gap:10px;justify-content:center;">
                                <div style="color:#d7b33d;font-size:0.95rem;font-weight:bold;letter-spacing:1px;margin-bottom:2px;">[전투 액션]</div>
                                <select id="attack-weapon-sel" class="combat-select" style="width:100%;box-sizing:border-box;padding:10px;font-size:0.9rem;background:#111;border:1px solid #444;color:#fff;">${wOpts}</select>
                                <label style="display:flex;align-items:center;justify-content:center;gap:6px;font-size:0.85rem;padding:10px;background:rgba(76,139,245,0.1);border:1px solid rgba(76,139,245,0.4);border-radius:6px;cursor:pointer;color:#4c8bf5;margin:0;">
                                    <input type="checkbox" id="attack-bp-boost" style="width:16px;height:16px;margin:0;cursor:pointer;">
                                    <span style="font-weight:bold;">법력 5점 소비 (데미지 2배)</span>
                                </label>
                            </div>
                            <div style="width:1px;background:rgba(215,179,61,0.2);"></div>
                            <div style="flex:1;display:flex;flex-direction:column;gap:8px;justify-content:center;">
                                <button class="combat-btn combat-btn-attack" style="width:100%;padding:14px;font-size:1.05rem;font-weight:bold;letter-spacing:1px;box-shadow:0 4px 6px rgba(0,0,0,0.3);" onclick="CombatSys.rollAttack()">공격 주사위</button>
                                <div style="display:flex;gap:8px;">
                                    <button class="combat-btn combat-btn-dodge"     style="flex:1;padding:8px;font-size:0.85rem;" onclick="CombatSys.soloFlee()">도주</button>
                                    <button class="combat-btn combat-btn-surrender" style="flex:1;padding:8px;font-size:0.85rem;" onclick="CombatSys.surrender()">항복</button>
                                </div>
                            </div>
                        </div>`;
                } else {
                    const attName = (attackerId === data.p1_id) ? p1.name : p2.name;
                    box.innerHTML = `<div style="text-align:center;color:#888;width:100%;padding:20px;"><b>${attName}</b>의 공격 대기 중...</div>`;
                }
                return;
            }

            // 3. 내가 맞을 위기에 처했을 때 뜨는 방어/회피 선택 메뉴 화면입니다. (자동차 긴급 회피 포함)
            if (phase === 'defense') {
                if (isDefender) {
                    const ar = data.attack_roll || {}, attGrade = ar.grade ?? 0, canDodge = attGrade < 3;
                    const attName  = (attackerId === data.p1_id) ? p1.name : p2.name;
                    const attWName = data.chosen_weapon?.name || '맨손';
                    const sk = myData.skills || { brawl:25, sword:25, bow:25, throw:20, magic:15, dodge:(myData.dex||50)*2, drive:20 };
                    const counterSkill = data.chosen_weapon?.type ? sk[data.chosen_weapon.type] : sk.brawl;
                    
                    box.innerHTML = `
                        <div style="background:rgba(20,20,20,0.8);border:1px solid rgba(215,179,61,0.3);border-radius:8px;padding:15px;box-sizing:border-box;width:100%;">
                            <div style="text-align:center;margin-bottom:15px;">
                                <div style="color:#aaa;font-size:0.9rem;margin-bottom:4px;"><b>${attName}</b>의 [${attWName}] 공격!</div>
                                <div style="color:${ar.gradeColor||'#fff'};font-weight:bold;font-size:1.3rem;text-shadow:0 0 5px ${ar.gradeColor||'transparent'};">${ar.gradeLabel||''} (${ar.roll})</div>
                                ${!canDodge ? `<div style="color:#ff4d4d;font-size:0.85rem;margin-top:6px;font-weight:bold;">극단적 성공 — 일반 회피 불가</div>` : ''}
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                                ${canDodge
                                    ? `<button class="combat-btn combat-btn-defend" style="padding:12px;font-size:1rem;font-weight:bold;" onclick="CombatSys.rollDefense('dodge')">[회피] 일반 회피<br><span style="font-size:0.8rem;font-weight:normal;">(${sk.dodge}%)</span></button>`
                                    : `<div style="padding:12px;background:rgba(255,0,0,0.1);border:1px solid rgba(255,0,0,0.3);border-radius:4px;color:#ff4d4d;text-align:center;display:flex;align-items:center;justify-content:center;font-size:0.9rem;">회피 불가</div>`}
                                <button class="combat-btn combat-btn-dodge" style="padding:12px;font-size:1rem;font-weight:bold;" onclick="CombatSys.rollDefense('counter')">[반격] 무기 반격<br><span style="font-size:0.8rem;font-weight:normal;">(${counterSkill}%)</span></button>
                            </div>
                            <!-- ★ 중요: 자동차 운전은 이렇게 긴급 회피 버튼으로만 달아줍니다! -->
                            <button class="combat-btn combat-btn-defend" style="width:100%;background:linear-gradient(135deg,#b8952d,#d7b33d);color:#111;padding:12px;font-size:1rem;font-weight:bold;border:none;box-shadow:0 4px 6px rgba(0,0,0,0.3);" onclick="CombatSys.rollDefense('magic_dodge')">[차량] 자동차 운전 (긴급 회피)<br><span style="font-size:0.85rem;font-weight:normal;">[법력 5 소모] (${sk.drive}%)</span></button>
                        </div>`;
                } else if (isAttacker) {
                    const defName = (attackerId === data.p1_id) ? p2.name : p1.name;
                    box.innerHTML = `<div style="text-align:center;color:#888;width:100%;padding:20px;"><b>${defName}</b>의 방어 선택 대기 중...</div>`;
                } else {
                    box.innerHTML = `<div style="text-align:center;color:#888;width:100%;padding:20px;">처리 중...</div>`;
                }
            }
        },

        // 팀전 화면(UI) 전체를 다시 그리는 함수입니다.
        updateTeamArenaUI(tc) {
            if (!tc) return;
            const logBox = document.getElementById('combat-log');
            if (logBox && tc.log) { logBox.innerHTML = tc.log.map(l => `<div>${l}</div>`).join(''); logBox.scrollTop = logBox.scrollHeight; }
            
            const scEl = document.getElementById('spectator-count'); if (scEl) scEl.innerText = (tc.spectators||[]).length;
            
            const sideA = document.getElementById('team-side-a'), sideB = document.getElementById('team-side-b');
            if (sideA) this._renderTeamSide(tc, tc.team_a||[], sideA, 'a', tc);
            if (sideB) this._renderTeamSide(tc, tc.team_b||[], sideB, 'b', tc);
            
            this._renderTeamActionPanel(tc);
        },

        // 팀전에서 한 쪽 팀에 속한 캐릭터 카드들을 가로로 쭉 나열해서 그려줍니다.
        _renderTeamSide(tc, members, container, side, fullTc) {
            const myCharId   = currentUser ? charOwners[currentUser.email] : null;
            const isMyTurn   = tc.combat_phase === 'action' && tc.attacker_id === myCharId;
            const myTeamSide = this.myTeam, oppSide = side !== myTeamSide;
            
            container.innerHTML = members.map(m => {
                const hpPct = Math.max(0, Math.round((m.hp / m.maxHp) * 100));
                const mpPct = Math.max(0, Math.round(((m.mp ?? m.maxMp) / m.maxMp) * 100));
                const bpPct = Math.max(0, Math.round(((m.bp ?? m.maxBp) / m.maxBp) * 100));
                const hpColor   = hpPct > 60 ? 'high' : hpPct > 30 ? 'mid' : 'low';
                
                const isTarget  = tc.target_id   === m.id;
                const isActor   = tc.attacker_id === m.id;
                const isDead    = !m.alive || m.hp <= 0;
                const isFled    = m.fled;
                // 공격할 내 차례이고, 상대 팀이고, 아직 살아있으면 클릭(공격 대상 지정) 가능!
                const clickable = isMyTurn && oppSide && m.alive && !m.fled;
                
                let cls = 'combatant-card';
                if (isActor && !isDead && !m.skipTurn) cls += ' acting'; // 반짝임 효과 추가
                if (isDead)     cls += ' dead';
                if (isFled)     cls += ' fled';
                if (clickable)  cls += ' targetable'; // 깜빡임 효과 추가
                if (isTarget)   cls += ' selected-target'; // 노란 테두리 효과 추가
                if (m.skipTurn) cls += ' skipped';
                
                return `<div class="${cls}" data-id="${m.id}" onclick="${clickable ? `CombatSys._selectTeamTarget('${m.id}')` : ''}">
                    <div class="turn-badge">${hpPct}%</div>
                    <img class="combatant-img" src="${m.img||PLACEHOLDER_100}" onerror="this.src='${PLACEHOLDER_100}'">
                    <div class="combatant-overlay">
                        <div class="combatant-name">${m.name}</div>
                        <div class="combatant-hp-bar"><div class="combatant-hp-fill" data-pct="${hpColor}" style="width:${hpPct}%"></div></div>
                        <div class="combatant-hp-bar" style="height:4px;margin-top:2px;background:rgba(0,0,0,0.5);"><div class="combatant-hp-fill" style="background:#4c8bf5;width:${mpPct}%"></div></div>
                        <div class="combatant-hp-bar" style="height:4px;margin-top:2px;background:rgba(0,0,0,0.5);"><div class="combatant-hp-fill" style="background:#d7b33d;width:${bpPct}%"></div></div>
                    </div>
                    ${isDead || isFled ? '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;z-index:20;"></div>' : ''}
                </div>`;
            }).join('');
        },

        // 팀전에서 공격할 대상을 클릭했을 때 하단에 공격 무기 고르는 창을 띄워줍니다.
        _selectTeamTarget(targetId) {
            const tc = this._latestTeam; if (!tc) return;
            const myCharId = charOwners[currentUser.email], me = this._findMember(tc, myCharId);
            if (!me) return;
            const target = this._findMember(tc, targetId);
            const sk = me.skills || { brawl:25, sword:25, bow:25, throw:20, magic:15, drive:20 };
            
            // ★ 팀전 공격에서도 자동차 운전은 안 나옵니다.
            let wOpts = `<option value="__unarmed__">[격투] 맨손 격투 (1d3 / 기능치 ${sk.brawl}%)</option>`;
            (me.weapons || []).forEach((w, i) => {
                const wSkill   = sk[w.type] || sk.brawl;
                const typeName = w.type==='sword'?'[도검]':w.type==='bow'?'[활]':w.type==='throw'?'[투척]':w.type==='magic'?'[도술]':'[격투]';
                wOpts += `<option value="${i}">${typeName} ${w.name} (${w.dmg} / 기능치 ${wSkill}%)</option>`;
            });
            
            document.getElementById('combat-actions').innerHTML = `
                <div style="display:flex;gap:15px;background:rgba(20,20,20,0.8);border:1px solid rgba(215,179,61,0.3);border-radius:8px;padding:15px;box-sizing:border-box;width:100%;">
                    <div style="flex:1;display:flex;flex-direction:column;gap:10px;justify-content:center;">
                        <div style="color:#d7b33d;font-size:0.9rem;font-weight:bold;letter-spacing:1px;margin-bottom:2px;">[대상] <b>${target?.name||'?'}</b></div>
                        <select id="team-weapon-sel" class="combat-select" style="width:100%;box-sizing:border-box;padding:10px;font-size:0.9rem;background:#111;border:1px solid #444;color:#fff;">${wOpts}</select>
                        <label style="display:flex;align-items:center;justify-content:center;gap:6px;font-size:0.85rem;padding:10px;background:rgba(76,139,245,0.1);border:1px solid rgba(76,139,245,0.4);border-radius:6px;cursor:pointer;color:#4c8bf5;margin:0;">
                            <input type="checkbox" id="team-bp-boost" style="width:16px;height:16px;margin:0;cursor:pointer;">
                            <span style="font-weight:bold;">법력 5점 소비 (데미지 2배)</span>
                        </label>
                        <input type="hidden" id="team-target-hidden" value="${targetId}">
                    </div>
                    <div style="width:1px;background:rgba(215,179,61,0.2);"></div>
                    <div style="flex:1;display:flex;flex-direction:column;gap:8px;justify-content:center;">
                        <button class="combat-btn combat-btn-attack" style="width:100%;padding:14px;font-size:1.05rem;font-weight:bold;letter-spacing:1px;box-shadow:0 4px 6px rgba(0,0,0,0.3);" onclick="CombatSys.teamAttack()">공격 주사위</button>
                        <div style="display:flex;gap:8px;">
                            <button class="combat-btn combat-btn-dodge"     style="flex:1;padding:8px;font-size:0.9rem;" onclick="CombatSys.teamFlee()">도주</button>
                            <button class="combat-btn combat-btn-surrender" style="flex:1;padding:8px;font-size:0.9rem;" onclick="CombatSys.teamSurrender()">항복</button>
                        </div>
                    </div>
                </div>`;
        },

        // 팀전 하단의 메뉴를 상황에 맞게 그려주는 함수입니다.
        _renderTeamActionPanel(tc) {
            const box = document.getElementById('combat-actions'); if (!box) return;
            
            if (tc.status === 'finished' || tc.combat_phase === 'finished') {
                box.innerHTML = `<div style="color:var(--accent-color);font-weight:bold;text-align:center;width:100%;padding:8px;">팀전 종료!<br><br><button class="combat-btn combat-btn-dodge" style="width:100%;" onclick="CombatSys.forceExitArena()">나가기</button></div>`;
                return;
            }
            if (this.myRole === 'spectator') {
                box.innerHTML = `<div style="text-align:center;color:#888;width:100%;padding:20px;">관전 중...<br><br><button class="combat-btn combat-btn-surrender" style="width:100%;" onclick="CombatSys.forceExitArena()">관전 종료</button></div>`;
                return;
            }
            
            const myCharId = charOwners[currentUser.email];
            const phase = tc.combat_phase, isMyTurn = tc.attacker_id === myCharId, isMyDefense = tc.target_id === myCharId && phase === 'defense';
            const me = this._findMember(tc, myCharId);

            // 대신 맞아줘서(난입 페널티로) 한 턴 쉬어야 할 때
            if (me?.skipTurn && (isMyTurn || isMyDefense)) {
                box.innerHTML = `<div style="text-align:center;color:#ff4d4d;font-weight:bold;width:100%;padding:20px;">이전 턴의 난입 방어로 인해 행동할 수 없습니다.</div>`;
                setTimeout(() => { if (isMyTurn) this._teamNextTurnAndSave(tc, [`<b>${me.name}</b>의 턴이 강제로 넘어갑니다.`]); }, 2000);
                return;
            }

            // 내 공격 차례일 때 (상대 카드를 누르라고 안내)
            if (phase === 'action' && isMyTurn) {
                if (!me || !me.alive || me.fled) { box.innerHTML = `<div style="text-align:center;color:#888;width:100%;padding:20px;">대기 중...</div>`; return; }
                box.innerHTML = `<div style="display:flex;flex-direction:column;gap:12px;width:100%;">
                    <div style="color:#aaa;text-align:center;">상대방 카드를 클릭해서 공격하세요.</div>
                    <div style="display:flex;gap:10px;">
                        <button class="combat-btn combat-btn-dodge"     style="flex:1;padding:12px;" onclick="CombatSys.teamFlee()">도주</button>
                        <button class="combat-btn combat-btn-surrender" style="flex:1;padding:12px;" onclick="CombatSys.teamSurrender()">항복</button>
                    </div>
                </div>`;
                return;
            }

            // 내가 맞을 차례일 때 (방어/회피 선택, 자동차 긴급 회피 포함)
            if (isMyDefense) {
                const att = this._findMember(tc, tc.attacker_id), ar = tc.attack_roll || {}, canDodge = (ar.grade || 0) < 3;
                const sk = me.skills || { brawl:25, sword:25, bow:25, throw:20, magic:15, dodge:(me.dex||50)*2, drive:20 };
                const counterSkill = tc.chosen_weapon?.type ? sk[tc.chosen_weapon.type] : sk.brawl;
                
                box.innerHTML = `
                    <div style="background:rgba(20,20,20,0.8);border:1px solid rgba(215,179,61,0.3);border-radius:8px;padding:15px;box-sizing:border-box;width:100%;">
                        <div style="text-align:center;margin-bottom:15px;">
                            <div style="color:#aaa;font-size:0.9rem;margin-bottom:4px;"><b>${att?.name||'?'}</b>의 [${tc.chosen_weapon?.name||'맨손'}] 공격!</div>
                            <div style="color:${ar.gradeColor||'#fff'};font-weight:bold;font-size:1.3rem;text-shadow:0 0 5px ${ar.gradeColor||'transparent'};">${ar.gradeLabel||''} (${ar.roll})</div>
                            ${!canDodge ? `<div style="color:#ff4d4d;font-size:0.85rem;margin-top:6px;font-weight:bold;">극단적 성공 — 일반 회피 불가</div>` : ''}
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">
                            ${canDodge
                                ? `<button class="combat-btn combat-btn-defend" style="padding:12px;font-size:1rem;font-weight:bold;" onclick="CombatSys.teamDefend('dodge')">[회피] 일반 회피<br><span style="font-size:0.8rem;font-weight:normal;">(${sk.dodge}%)</span></button>`
                                : `<div style="padding:12px;background:rgba(255,0,0,0.1);border:1px solid rgba(255,0,0,0.3);border-radius:4px;color:#ff4d4d;text-align:center;display:flex;align-items:center;justify-content:center;font-size:0.9rem;">회피 불가</div>`}
                            <button class="combat-btn combat-btn-dodge" style="padding:12px;font-size:1rem;font-weight:bold;" onclick="CombatSys.teamDefend('counter')">[반격] 무기 반격<br><span style="font-size:0.8rem;font-weight:normal;">(${counterSkill}%)</span></button>
                        </div>
                        <button class="combat-btn combat-btn-defend" style="width:100%;background:linear-gradient(135deg,#b8952d,#d7b33d);color:#111;padding:12px;font-size:1rem;font-weight:bold;border:none;box-shadow:0 4px 6px rgba(0,0,0,0.3);" onclick="CombatSys.teamDefend('magic_dodge')">[차량] 자동차 운전 (긴급 회피)<br><span style="font-size:0.85rem;font-weight:normal;">[법력 5 소모] (${sk.drive}%)</span></button>
                    </div>`;
                return;
            }

            // 내 팀원이 맞고 있을 때, 팀원을 감싸주기(난입) 버튼을 보여줍니다.
            if (phase === 'defense' && tc.target_id && tc.target_id !== myCharId && me?.alive && !me?.fled && !me?.skipTurn) {
                const targetAllies = (this.myTeam === 'a' ? tc.team_a : tc.team_b).find(m => m.id === tc.target_id);
                if (targetAllies) {
                    box.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;width:100%;">
                        <div style="text-align:center;color:#888;">아군이 공격받고 있습니다!</div>
                        <button class="combat-btn" style="background:#d7b33d;color:#111;font-weight:bold;padding:10px;" onclick="CombatSys.teamGuard('${tc.target_id}')">[방어] 난입하여 대신 맞기 (다음 턴 희생)</button>
                    </div>`;
                    return;
                }
            }
            
            // 내 차례가 아니면 그냥 대기하라고 띄웁니다.
            box.innerHTML = `<div style="text-align:center;color:#888;width:100%;padding:20px;">대기 중...</div>`;
        },

        // 현재 보고 있는 전투(단일전 또는 목인장) 정보를 넘겨주는 보조 함수
        _getCombat()  { return this.isDummyPractice ? this._dummyCombat : this._latestCombat; },
        // 변경된 단일전 전투 정보를 서버에 저장하는 함수
        async _updateCombat(updates) {
            if (this.isDummyPractice) { Object.assign(this._dummyCombat, updates); this.updateArenaUI(this._dummyCombat); return; }
            if (!this.currentCombatId) return;
            await supabaseClient.from('combats').update(updates).eq('id', this.currentCombatId);
        },

        // ─────────────────────────────────────────────────────────────────
        // 5. 단일전 주사위 굴리기 로직 (공격/방어)
        // ─────────────────────────────────────────────────────────────────
        async rollInitiative() {
            const combat = this._getCombat(); if (!combat) return;
            const p1 = combat.p1_data, p2 = combat.p2_data;
            const r1 = this._roll(p1.dex), r2 = this._roll(p2.dex);
            const logs = [...(combat.log || [])];
            
            logs.push(`━━━━━ Round ${combat.round} ━━━━━`);
            logs.push(`[선공판정] <b>${p1.name}</b> DEX(${p1.dex}) 주사위:${r1.roll} → <span style="color:${r1.color}">${r1.label}</span>`);
            logs.push(`[선공판정] <b>${p2.name}</b> DEX(${p2.dex}) 주사위:${r2.roll} → <span style="color:${r2.color}">${r2.label}</span>`);
            
            // 등급이 같으면 원래 민첩이 빠른 사람이 먼저 칩니다.
            let attackerId = r1.grade !== r2.grade ? (r1.grade > r2.grade ? combat.p1_id : combat.p2_id) : (p1.dex >= p2.dex ? combat.p1_id : combat.p2_id);
            logs.push(`<b style="color:var(--accent-color)">${attackerId === combat.p1_id ? p1.name : p2.name}</b> 선공!`);
            
            await this._updateCombat({ combat_phase: 'attack', attacker_id: attackerId, log: logs });
        },

        // 단일전 내 차례에 공격 버튼 누르기
        async rollAttack() {
            const combat = this._getCombat(); if (!combat) return;
            const isP1 = this.myRole === 'p1';
            const myData  = { ...(isP1 ? combat.p1_data : combat.p2_data) };
            const sk = myData.skills || { brawl:25, sword:25, bow:25, throw:20, magic:15 };
            const weaponIdx = document.getElementById('attack-weapon-sel')?.value;
            const isBoost   = document.getElementById('attack-bp-boost')?.checked;
            
            let weapon;
            if (!weaponIdx || weaponIdx === '__unarmed__') weapon = { name: '맨손', dmg: '1d3', type: 'brawl', skill: sk.brawl };
            else { const w = myData.weapons[parseInt(weaponIdx)]; weapon = { name: w.name, dmg: w.dmg, type: w.type, skill: sk[w.type] || sk.brawl }; }
            
            // 법력 5를 써서 데미지를 2배로 뻥튀기하는 기능
            if (isBoost) {
                if ((myData.bp ?? 0) < 5) return alert('법력이 부족합니다!');
                myData.bp -= 5;
            }
            
            const result = this._roll(weapon.skill), logs = [...(combat.log || [])];
            logs.push(`[공격] <b>${myData.name}</b> [${weapon.name}] ${isBoost ? '<span style="color:#d7b33d">(법력 증폭)</span> ' : ''}주사위:${result.roll} → <span style="color:${result.color}">${result.label}</span>`);
            
            const myDataKey = isP1 ? 'p1_data' : 'p2_data';
            let updates = { [myDataKey]: myData };
            
            if (result.grade === 4) { // 대성공이면 상대는 피할 틈 없이 바로 데미지를 먹습니다.
                logs.push(`<span style="color:#ffd700;font-weight:bold;">대성공!</span> 방어 불가!`);
                Object.assign(updates, await this._applyDamage({ ...combat, [myDataKey]: myData }, charOwners[currentUser.email], weapon, result, logs, true, isBoost));
            } else if (result.grade <= 0) { // 실패나 대실패면 허공을 가르고 턴이 끝납니다.
                logs.push(result.grade === 0 ? `빗나감.` : `대실패…`);
                Object.assign(updates, this._nextTurn(combat, logs));
            } else { // 보통/어려운/극단적 성공이면 상대에게 피할 기회를 줍니다.
                Object.assign(updates, { combat_phase: 'defense', chosen_weapon: { ...weapon, isBoost }, attack_roll: { roll: result.roll, grade: result.grade, gradeLabel: result.label, gradeColor: result.color } });
            }
            await this._updateCombat({ ...updates, log: logs });
        },

        // 단일전 내가 맞을 위기일 때 방어/회피 버튼 누르기
        async rollDefense(type) {
            const combat = this._getCombat(); if (!combat) return;
            const isP1 = this.myRole === 'p1';
            const myData  = { ...(isP1 ? combat.p1_data : combat.p2_data) };
            const attData = { ...(isP1 ? combat.p2_data : combat.p1_data) };
            const attWeapon = combat.chosen_weapon || { name: '맨손', dmg: '1d3', type: 'brawl', skill: 25 };
            const attRoll   = combat.attack_roll   || { grade: 1 };
            const sk = myData.skills || { brawl:25, sword:25, bow:25, throw:20, magic:15, dodge:(myData.dex||50)*2, drive:20 };
            
            let skillVal = sk.dodge, label = '회피';
            if (type === 'counter')    { skillVal = sk[attWeapon.type] || sk.brawl; label = '반격'; }
            
            // 법력 5를 써서 자동차 운전 기술로 멋지게 도망가기 (긴급 회피)
            if (type === 'magic_dodge') {
                if ((myData.bp ?? 0) < 5) return alert('법력이 부족합니다!');
                myData.bp -= 5; skillVal = sk.drive; label = '자동차 운전(긴급 회피)';
            }
            
            const result = this._roll(skillVal), logs = [...(combat.log || [])];
            logs.push(`[${label}] <b>${myData.name}</b> 주사위:${result.roll} → <span style="color:${result.color}">${result.label}</span>`);
            
            const attGrade = attRoll.grade || 0, defGrade = result.grade, isAttEx = attGrade >= 3;
            const myDataKey = isP1 ? 'p1_data' : 'p2_data';
            
            let updates = { [myDataKey]: myData };
            const baseState = { ...combat, [myDataKey]: myData };
            
            // 회피를 골랐을 때
            if (type === 'dodge' || type === 'magic_dodge') {
                // 내 주사위가 공격자 주사위랑 같거나 더 잘 나왔으면 회피 성공!
                if (defGrade > 0 && defGrade >= attGrade) { logs.push(`회피 성공!`); Object.assign(updates, this._nextTurn(baseState, logs)); }
                else { logs.push(`회피 실패!`); Object.assign(updates, await this._applyDamage(baseState, combat.attacker_id, attWeapon, attRoll, logs, isAttEx, attWeapon.isBoost)); }
            } 
            // 반격을 골랐을 때
            else {
                if (defGrade > attGrade) { // 내가 더 잘 나오면 오히려 상대를 때립니다.
                    logs.push(`반격 성공!`);
                    Object.assign(updates, await this._applyDamage(baseState, charOwners[currentUser.email], { name:'반격', dmg:'1d3', type:'brawl', skill: sk.brawl }, result, logs, defGrade >= 3, false));
                } else if (defGrade === attGrade && defGrade > 0) { // 비겼으면 서로 한 대씩 치고받습니다.
                    logs.push(`반격 동률! 서로 맞습니다!`);
                    const res1 = await this._applyDamage(baseState, combat.attacker_id, attWeapon, attRoll, logs, isAttEx, attWeapon.isBoost);
                    const res2 = await this._applyDamage({ ...baseState, ...res1 }, charOwners[currentUser.email], { name:'반격', dmg:'1d3', type:'brawl', skill: sk.brawl }, result, logs, defGrade >= 3, false);
                    Object.assign(updates, res2);
                } else { // 내가 못 나왔으면 그냥 뚜드려 맞습니다.
                    logs.push(`반격 실패!`);
                    Object.assign(updates, await this._applyDamage(baseState, combat.attacker_id, attWeapon, attRoll, logs, isAttEx, attWeapon.isBoost));
                }
            }
            await this._updateCombat({ ...updates, log: logs });
        },

        // 실제로 누군가의 체력을 깎고 데미지를 기록하는 함수입니다.
        async _applyDamage(combat, attackerCharId, weapon, attackRoll, logs, isCritical, isBoost) {
            const isP1att = combat.p1_id === attackerCharId;
            const attData = { ...(isP1att ? combat.p1_data : combat.p2_data) };
            const defData = { ...(isP1att ? combat.p2_data : combat.p1_data) };
            
            let weapDmg = this._rollDmg(weapon.dmg, isCritical);
            if (isBoost) weapDmg *= 2; // 법력 버프 2배
            
            const db = attData.db || { dice: 0, mod: 0 };
            let dbVal = db.mod;
            if (db.dice > 0) dbVal += isCritical ? db.dice : Math.floor(Math.random() * db.dice) + 1; // 덩치(추가) 보너스 굴리기
            
            const totalDmg = Math.max(0, weapDmg + dbVal);
            logs.push(`[타격] <b>${attData.name}</b>의 타격! → <b style="color:#ff4d4d">총 ${totalDmg} 피해</b>`);
            
            defData.hp = (defData.hp ?? defData.maxHp) - totalDmg;
            
            let newStatus = combat.status;
            if (defData.hp <= 0) { // 체력이 다 닳았으면 게임 끝
                defData.hp = 0; defData.alive = false; logs.push(`<b>${defData.name}</b> 의식 불명!`); newStatus = 'finished'; 
            }
            else { logs.push(`<b>${defData.name}</b> 남은 HP: ${defData.hp}/${defData.maxHp}`); }
            
            const updates = {
                p1_data: isP1att ? attData : defData,
                p2_data: isP1att ? defData : attData,
                status: newStatus,
                chosen_weapon: null,
                attack_roll: null
            };
            
            if (newStatus === 'finished') updates.combat_phase = 'finished';
            else Object.assign(updates, this._nextTurn(combat, logs)); // 살아있으면 다음 턴으로 넘김
            
            return updates;
        },

        // 단일전에서 공격/방어가 한 세트 끝나면 다음 사람으로 차례를 넘겨주는 함수입니다.
        _nextTurn(combat, logs) {
            const nextAtt   = combat.attacker_id === combat.p1_id ? combat.p2_id : combat.p1_id;
            const nextRound = nextAtt === combat.p1_id ? combat.round + 1 : combat.round;
            if (nextAtt === combat.p1_id) logs.push(`━━━━━ Round ${nextRound} ━━━━━`);
            
            const pData = nextAtt === combat.p1_id ? combat.p1_data : combat.p2_data;
            if (pData.skipTurn) { // 누군가를 감싸주느라 이번 턴을 못 쓴다면 패스합니다.
                logs.push(`<b>${pData.name}</b> 난입 페널티로 한 턴 쉽니다.`);
                pData.skipTurn = false;
                return this._nextTurn({ ...combat, round: nextRound, attacker_id: nextAtt, [nextAtt === combat.p1_id ? 'p1_data' : 'p2_data']: pData }, logs);
            }
            
            logs.push(`[${pData.name}의 차례] 공격하세요.`);
            return { combat_phase: 'attack', attacker_id: nextAtt, chosen_weapon: null, attack_roll: null, round: nextRound };
        },


        // ─────────────────────────────────────────────────────────────────
        // 6. 팀전 전용 동작들 (팀전 공격, 팀전 방어 등)
        // ─────────────────────────────────────────────────────────────────
        async teamAttack() {
            const tc = this._latestTeam; if (!tc) return;
            const myCharId = charOwners[currentUser.email];
            const me = { ...this._findMember(tc, myCharId) };
            const targetId  = document.getElementById('team-target-hidden')?.value;
            const weaponIdx = document.getElementById('team-weapon-sel')?.value;
            const isBoost   = document.getElementById('team-bp-boost')?.checked;
            
            const sk = me.skills || { brawl:25, sword:25, bow:25, throw:20, magic:15 };
            let weapon;
            if (!weaponIdx || weaponIdx === '__unarmed__') weapon = { name: '맨손', dmg: '1d3', type: 'brawl', skill: sk.brawl };
            else { const w = me.weapons[parseInt(weaponIdx)]; weapon = { name: w.name, dmg: w.dmg, type: w.type, skill: sk[w.type] || sk.brawl }; }
            
            if (isBoost) {
                if ((me.bp ?? 0) < 5) return alert('법력이 부족합니다!');
                me.bp -= 5;
            }
            
            const result = this._roll(weapon.skill), logs = [...(tc.log || [])];
            logs.push(`[공격] <b>${me.name}</b> [${weapon.name}] ${isBoost ? '<span style="color:#d7b33d">(법력 증폭)</span> ' : ''}주사위:${result.roll} → <span style="color:${result.color}">${result.label}</span>`);
            
            const teamKey = this.myTeam === 'a' ? 'team_a' : 'team_b';
            let updates = { [teamKey]: (tc[teamKey] || []).map(m => m.id === myCharId ? { ...m, bp: me.bp } : m) };
            const tcWithBp = { ...tc, ...updates };
            
            if (result.grade === 4) {
                logs.push(`<span style="color:#ffd700;font-weight:bold;">대성공!</span>`);
                Object.assign(updates, await this._applyTeamDamage(tcWithBp, myCharId, targetId, weapon, result, logs, true, isBoost));
            } else if (result.grade <= 0) {
                logs.push(result.grade === 0 ? `빗나감.` : `대실패…`);
                Object.assign(updates, this._teamNextTurn(tcWithBp, logs));
            } else {
                Object.assign(updates, { combat_phase: 'defense', attacker_id: myCharId, target_id: targetId, chosen_weapon: { ...weapon, isBoost }, attack_roll: { roll: result.roll, grade: result.grade, gradeLabel: result.label, gradeColor: result.color } });
            }
            await supabaseClient.from('team_combats').update({ ...updates, log: logs }).eq('id', this.currentTeamId);
        },

        async teamDefend(type) {
            const tc = this._latestTeam; if (!tc) return;
            const myCharId = charOwners[currentUser.email];
            const me = { ...this._findMember(tc, myCharId) };
            const attWeapon = tc.chosen_weapon, attRoll = tc.attack_roll || { grade: 1 };
            const sk = me.skills || { brawl:25, sword:25, bow:25, throw:20, magic:15, dodge:(me.dex||50)*2, drive:20 };
            
            let skillVal = sk.dodge, label = '회피';
            if (type === 'counter')    { skillVal = sk[attWeapon.type] || sk.brawl; label = '반격'; }
            
            if (type === 'magic_dodge') {
                if ((me.bp ?? 0) < 5) return alert('법력이 부족합니다!');
                me.bp -= 5; skillVal = sk.drive; label = '자동차 운전(긴급 회피)';
            }
            
            const result = this._roll(skillVal), logs = [...(tc.log || [])];
            logs.push(`[${label}] <b>${me.name}</b> 주사위:${result.roll} → <span style="color:${result.color}">${result.label}</span>`);
            
            const attGrade = attRoll.grade || 0, defGrade = result.grade;
            const teamKey = this.myTeam === 'a' ? 'team_a' : 'team_b';
            let updates = { [teamKey]: (tc[teamKey] || []).map(m => m.id === myCharId ? { ...m, bp: me.bp } : m) };
            const tcWithBp = { ...tc, ...updates };
            
            if (type === 'dodge' || type === 'magic_dodge') {
                if (defGrade > 0 && defGrade >= attGrade) { logs.push(`회피 성공!`); Object.assign(updates, this._teamNextTurn(tcWithBp, logs)); }
                else { logs.push(`회피 실패!`); Object.assign(updates, await this._applyTeamDamage(tcWithBp, tc.attacker_id, myCharId, attWeapon, attRoll, logs, attGrade >= 3, attWeapon.isBoost)); }
            } else {
                if (defGrade > attGrade) {
                    logs.push(`반격 성공!`);
                    Object.assign(updates, await this._applyTeamDamage(tcWithBp, myCharId, tc.attacker_id, { name:'반격', dmg:'1d3', type:'brawl', skill: sk.brawl }, result, logs, defGrade >= 3, false));
                } else if (defGrade === attGrade && defGrade > 0) {
                    logs.push(`반격 동률! 상호 피해!`);
                    const res1 = await this._applyTeamDamage(tcWithBp, tc.attacker_id, myCharId, attWeapon, attRoll, logs, attGrade >= 3, attWeapon.isBoost);
                    const res2 = await this._applyTeamDamage({ ...tcWithBp, ...res1 }, myCharId, tc.attacker_id, { name:'반격', dmg:'1d3', type:'brawl', skill: sk.brawl }, result, logs, defGrade >= 3, false);
                    Object.assign(updates, res2);
                } else {
                    logs.push(`반격 실패!`);
                    Object.assign(updates, await this._applyTeamDamage(tcWithBp, tc.attacker_id, myCharId, attWeapon, attRoll, logs, attGrade >= 3, attWeapon.isBoost));
                }
            }
            await supabaseClient.from('team_combats').update({ ...updates, log: logs }).eq('id', this.currentTeamId);
        },

        // 같은 팀원이 공격받을 때, 내가 대신 맞아주는 듬직한 기능!
        async teamGuard(targetId) {
            const tc = this._latestTeam; if (!tc) return;
            const myCharId = charOwners[currentUser.email];
            const me = this._findMember(tc, myCharId), target = this._findMember(tc, targetId);
            
            const logs = [...(tc.log || [])];
            logs.push(`[방어] <b>${me.name}</b> 난입! <b>${target.name}</b> 대신 맞습니다. (다음 턴 쉼)`);
            
            const teamKey = this.myTeam === 'a' ? 'team_a' : 'team_b';
            // 다음 내 차례 때 skipTurn 변수가 true가 되어 한 턴 쉬게 됩니다.
            const updates = { target_id: myCharId, [teamKey]: (tc[teamKey] || []).map(m => m.id === myCharId ? { ...m, skipTurn: true } : m) };
            
            await supabaseClient.from('team_combats').update({ ...updates, log: logs }).eq('id', this.currentTeamId);
        },

        // 팀전에서 체력을 깎고 누군가 죽었는지, 팀이 졌는지 확인하는 함수입니다.
        async _applyTeamDamage(tc, attackerCharId, defenderCharId, weapon, attackRoll, logs, isCritical, isBoost) {
            const att = this._findMember(tc, attackerCharId), def = this._findMember(tc, defenderCharId);
            let weapDmg = this._rollDmg(weapon.dmg, isCritical); if (isBoost) weapDmg *= 2;
            
            const db = att?.db || { dice: 0, mod: 0 };
            let dbVal = db.mod; if (db.dice > 0) dbVal += isCritical ? db.dice : Math.floor(Math.random() * db.dice) + 1;
            
            const totalDmg = Math.max(0, weapDmg + dbVal);
            logs.push(`[타격] <b>${att?.name||'?'}</b>의 타격! → <b style="color:#ff4d4d">총 ${totalDmg} 피해</b>`);
            this._hitEffect(defenderCharId, totalDmg);
            
            let newTeamA = [...(tc.team_a || [])], newTeamB = [...(tc.team_b || [])];
            const applyHp = m => { const nm = { ...m }; nm.hp = (nm.hp ?? nm.maxHp) - totalDmg; if (nm.hp <= 0) { nm.hp = 0; nm.alive = false; } return nm; };
            
            const defTeam = (tc.team_a || []).some(m => m.id === defenderCharId) ? 'a' : 'b';
            if (defTeam === 'a') newTeamA = newTeamA.map(m => m.id === defenderCharId ? applyHp(m) : m);
            else                 newTeamB = newTeamB.map(m => m.id === defenderCharId ? applyHp(m) : m);
            
            const defAfter = (defTeam === 'a' ? newTeamA : newTeamB).find(m => m.id === defenderCharId);
            
            // 만약 공격받은 사람이 기절했다면
            if (!defAfter.alive) {
                logs.push(`<b>${defAfter.name}</b> 전사!`);
                setTimeout(() => this._deathEffect(defenderCharId), 100);
                
                // 팀 전체가 누웠는지(죽거나 도망감) 확인합니다.
                if (this._teamDead(newTeamA)) { logs.push(`팀 B 승리!`); return { team_a: newTeamA, team_b: newTeamB, status: 'finished', combat_phase: 'finished', chosen_weapon: null, attack_roll: null }; }
                if (this._teamDead(newTeamB)) { logs.push(`팀 A 승리!`); return { team_a: newTeamA, team_b: newTeamB, status: 'finished', combat_phase: 'finished', chosen_weapon: null, attack_roll: null }; }
            }
            return { team_a: newTeamA, team_b: newTeamB, ...this._teamNextTurn({ ...tc, team_a: newTeamA, team_b: newTeamB }, logs) };
        },

        // 팀전에서 다음 행동 순서를 찾아내는 함수입니다.
        _teamNextTurn(tc, logs) {
            const order = tc.turn_order || []; if (!order.length) return { combat_phase: 'finished' };
            
            let idx = tc.current_turn_idx ?? 0; 
            idx = (idx + 1) % order.length; // 다음 사람으로 인덱스 넘기기
            let tries = 0;
            
            // 아직 살아있고, 안 도망간 다음 사람을 계속해서 찾습니다.
            while (tries < order.length) {
                const candidate = order[idx], m = this._findMember(tc, candidate.id);
                if (m && m.alive && !m.fled) break;
                idx = (idx + 1) % order.length; tries++;
            }
            if (tries >= order.length) return { combat_phase: 'finished', status: 'finished' };
            
            const next = order[idx], nextM = this._findMember(tc, next.id);
            if (nextM?.skipTurn) {
                logs.push(`<b>${next.name}</b> 난입 페널티로 한 턴 쉽니다.`);
                const teamKey = next.team === 'a' ? 'team_a' : 'team_b';
                tc[teamKey] = (tc[teamKey] || []).map(m => m.id === next.id ? { ...m, skipTurn: false } : m);
                tc.current_turn_idx = idx;
                return this._teamNextTurn(tc, logs); // 한 번 더 넘깁니다.
            }
            
            logs.push(`[${next.team === 'a' ? '팀A' : '팀B'}] <b>${next.name}</b>의 차례.`);
            return { combat_phase: 'action', current_turn_idx: idx, attacker_id: next.id, target_id: null, chosen_weapon: null, attack_roll: null, team_a: tc.team_a, team_b: tc.team_b };
        },
        async _teamNextTurnAndSave(tc, extraLogs) {
            const logs = [...(tc.log || []), ...(extraLogs || [])];
            const updates = this._teamNextTurn(tc, logs);
            await supabaseClient.from('team_combats').update({ ...updates, log: logs }).eq('id', tc.id);
        },

        // ─────────────────────────────────────────────────────────────────
        // 7. 베팅 및 기타 시스템 (도주, 항복)
        // ─────────────────────────────────────────────────────────────────
        async bet(side) {
            if (!currentUser) return alert('로그인이 필요합니다.');
            if (this.isDummyPractice) return alert('연습 대련에서는 베팅할 수 없습니다.');
            
            const myCharId = charOwners[currentUser.email];
            const myName   = charData.find(c => `char-${c.id}` === myCharId)?.name || '익명';
            const amtEl    = document.getElementById(`bet-amt-${side}`);
            const amount   = parseInt(amtEl?.value || '0');
            
            if (!amount || amount <= 0) return alert('베팅 금액을 입력하세요.');
            
            const combat = this._latestCombat; if (!combat) return alert('대련 정보가 없습니다.');
            const bets = combat.bets || { p1: [], p2: [] };
            
            // 이미 건 사람은 중복해서 걸지 못하게 막습니다.
            const already = [...(bets.p1 || []), ...(bets.p2 || [])].find(b => b.charId === myCharId);
            if (already) return alert('이미 베팅하셨습니다.');
            
            const { data: profile } = await supabaseClient.from('character_profiles').select('money').eq('char_id', myCharId).eq('phase', 0).single();
            const myMoney = profile?.money ? parseInt(String(profile.money).replace(/,/g,''), 10) : 0;
            if (myMoney < amount) return alert(`소지금 부족! (보유: ${myMoney.toLocaleString()} G)`);
            
            // 내 돈에서 깎고 서버에 저장
            await supabaseClient.from('character_profiles').update({ money: myMoney - amount }).eq('char_id', myCharId).eq('phase', 0);
            
            // 판돈 올리기
            const newBets = { p1: [...(bets.p1 || [])], p2: [...(bets.p2 || [])] };
            newBets[side].push({ charId: myCharId, name: myName, amount });
            await supabaseClient.from('combats').update({ bets: newBets }).eq('id', this.currentCombatId);
            
            if (amtEl) amtEl.value = '';
            alert(`[확인] ${side.toUpperCase()} 진영에 ${amount.toLocaleString()} G 베팅 완료!`);
            this._renderMyMoney();
        },

        // 화면 하단에 내 소지금을 항상 표시해주는 함수
        async _renderMyMoney() {
            if (!currentUser || !supabaseClient) return;
            const myCharId = charOwners[currentUser.email]; if (!myCharId) return;
            const { data } = await supabaseClient.from('character_profiles').select('money').eq('char_id', myCharId).eq('phase', 0).single();
            const money = data?.money ? parseInt(String(data.money).replace(/,/g,''), 10) : 0;
            const fmt   = money.toLocaleString() + ' G';
            const el1 = document.getElementById('bet-my-money-p1'); if (el1) el1.innerText = fmt;
            const el2 = document.getElementById('bet-my-money-p2'); if (el2) el2.innerText = fmt;
        },

        // 단일전에서 줄행랑을 칠 때 부르는 함수
        async soloFlee() {
            const combat = this._getCombat(); if (!combat || !confirm('도주하시겠습니까?')) return;
            const md = (this.myRole === 'p1') ? combat.p1_data : combat.p2_data;
            const r = this._roll(md.dex * 2), l = [...(combat.log || [])];
            
            l.push(`[도주] <b>${md.name}</b> 주사위:${r.roll}`);
            // 도주 성공 (DEX*2 이하로 나옴)
            if (r.grade > 0) { l.push(`도주 성공!`); await this._updateCombat({ status: 'finished', combat_phase: 'finished', log: l }); }
            else             { l.push(`도주 실패!`); await this._updateCombat({ ...this._nextTurn(combat, l), log: l }); }
        },
        // 단일전에서 항복하기
        async surrender() {
            const c = this._getCombat(); if (!c || !confirm('항복하시겠습니까?')) return;
            const i = (this.myRole === 'p1'), m = i ? { ...c.p1_data } : { ...c.p2_data };
            m.hp = 0; const l = [...(c.log || [])]; l.push(`<b>${m.name}</b> 항복!`);
            await this._updateCombat({ p1_data: i ? m : c.p1_data, p2_data: i ? c.p2_data : m, status: 'finished', combat_phase: 'finished', log: l });
        },
        
        // 팀전에서 줄행랑치기
        async teamFlee() {
            const tc = this._latestTeam; if (!tc || !confirm('도주하시겠습니까?')) return;
            const mid = charOwners[currentUser.email], m = this._findMember(tc, mid);
            const r = this._roll((m.dex || 50) * 2), l = [...(tc.log || [])];
            l.push(`[도주] <b>${m.name}</b> 주사위:${r.roll}`);
            
            if (r.grade > 0) {
                l.push(`도주 성공!`);
                const tk = this.myTeam === 'a' ? 'team_a' : 'team_b';
                // 내 카드 상태를 fled = true 로 바꿉니다.
                const ut = (tc[tk] || []).map(x => x.id === mid ? { ...x, fled: true } : x);
                let u = { [tk]: ut };
                
                // 나 빼고 팀원 다 누워있었으면 우리 팀 전체 패배
                if (this._teamDead(ut)) { u.status = 'finished'; u.combat_phase = 'finished'; }
                else Object.assign(u, this._teamNextTurn({ ...tc, ...u }, l)); // 살아있는 다른 사람으로 턴 넘기기
                
                await supabaseClient.from('team_combats').update({ ...u, log: l }).eq('id', tc.id);
            } else {
                l.push(`도주 실패!`);
                await supabaseClient.from('team_combats').update({ ...this._teamNextTurn(tc, l), log: l }).eq('id', tc.id);
            }
        },
        // 팀전에서 항복하기
        async teamSurrender() {
            const tc = this._latestTeam; if (!tc || !confirm('항복하시겠습니까?')) return;
            const mid = charOwners[currentUser.email], l = [...(tc.log || [])];
            const tk = this.myTeam === 'a' ? 'team_a' : 'team_b';
            
            const ut = (tc[tk] || []).map(x => x.id === mid ? { ...x, alive: false, hp: 0 } : x);
            l.push(`<b>${this._findMember(tc, mid)?.name||'?'}</b> 항복!`);
            let u = { [tk]: ut };
            
            if (this._teamDead(ut)) { u.status = 'finished'; u.combat_phase = 'finished'; }
            else Object.assign(u, this._teamNextTurn({ ...tc, ...u }, l));
            await supabaseClient.from('team_combats').update({ ...u, log: l }).eq('id', tc.id);
        },

        // '방 폭파' 혹은 투기장을 나갈 때 쓰는 함수들입니다.
        async exitArena() {
            const t = this.mode === 'team' ? 'team_combats' : 'combats';
            const c = this.mode === 'team' ? this.currentTeamId : this.currentCombatId;
            // 관전자가 아니고, 그냥 방을 폭파하는 경우라면 서버 DB에서도 방을 날려버립니다.
            if (this.myRole !== 'spectator' && !this.isDummyPractice && confirm('방을 폭파하시겠습니까?\n(모든 참가자가 로비로 돌아갑니다)'))
                await supabaseClient.from(t).delete().eq('id', c);
            this.forceExitArena(); // 그리고 화면 닫기
        },
        
        forceExitArena() {
            if (this.arenaChannel) { try { supabaseClient.removeChannel(this.arenaChannel); } catch(e) {} }
            this.currentCombatId = null; this.currentTeamId = null; this.myRole = 'spectator'; this.myTeam = null; this.isDummyPractice = false;
            
            const a = document.getElementById('sparring-arena'); if (a) a.style.display = 'none';
            if (this.mode === 'team') this._renderTeamLobby(); else this.loadLobby();
            this._startLobbyWatch(); // 다시 대기실 감시 시작
        }
    };

    window.CombatSys = CombatSys; // 다른 파일에서도 CombatSys.머시기() 로 이 기능들을 쓸 수 있게 만들어줍니다.
})();