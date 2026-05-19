/* ================================================================= */
/*  Radar.js — 레이더(방사형/팔각형) 차트 그리기 기능 파일               */
/*  초보자 안내: 이 파일은 캐릭터의 8가지 능력치를 바탕으로 삐죽삐죽한   */
/*  팔각형 그래프를 화면에 예쁘게 그려주는(SVG) 역할을 합니다.           */
/* ================================================================= */

(function () {
    // 코드가 꼬이지 않게 보호하는 울타리 안에서 시작합니다.

    // ── 1. 그래프를 그리기 위한 기본 수학 설정 ──────────────────────────
    const LABELS = ['근력', '건강', '크기', '민첩', '외모', '지능', '정신', '교육']; // 8개의 능력치 이름
    const N      = 8;                        // 꼭짓점 개수 (팔각형이므로 8개)
    const CX     = 100;                      // 그림판(SVG)의 가로 중심점 (전체 200 중 절반)
    const CY     = 100;                      // 그림판(SVG)의 세로 중심점 (전체 200 중 절반)
    const R      = 72;                       // 거미줄의 최대 크기(반지름)
    const STEP   = (Math.PI * 2) / N;        // 360도를 8개로 나눈 각도 간격
    const OFFSET = -Math.PI / 2;             // 그래프 시작점을 3시 방향이 아닌 12시 방향(위쪽)으로 맞추기 위한 각도 조절

    // ── 2. 그림(SVG) 그리기 도우미 함수들 ──────────────────────────────
    
    // HTML에 그림을 그리기 위한 '특수 태그(SVG)'를 만들어주는 도우미입니다.
    function el(tag, attrs) {
        const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
        if (attrs) Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
        return e;
    }

    // 중심점에서 특정 각도와 거리만큼 떨어진 곳의 화면 위치(x, y)를 계산해주는 수학 공식입니다.
    function pt(i, r) {
        const a = STEP * i + OFFSET;
        return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
    }

    // 계산된 여러 개의 (x, y) 위치들을 선으로 이을 수 있게 하나의 글자로 묶어줍니다.
    function toPoints(arr) {
        return arr.map((v, i) => {
            const { x, y } = pt(i, v);
            return `${x},${y}`;
        }).join(' ');
    }


    // ────────────────────────────────────────────────────────────
    // 3. 차트 그리기 핵심 함수
    // ────────────────────────────────────────────────────────────
    function drawOne(wrapper) {

        // 1. 도화지(SVG) 준비하기
        // 화면에서 그림을 그릴 공간을 찾고, 없으면 새로 만듭니다.
        let svg = wrapper.querySelector('svg.radar-chart');
        if (!svg) {
            svg = el('svg', { viewBox: '0 0 200 200', class: 'radar-chart' });
            const container = wrapper.querySelector('.radar-chart-container') || wrapper;
            container.appendChild(svg);
        }
        svg.setAttribute('viewBox', '0 0 200 200'); // 200x200 크기의 도화지를 씁니다.

        // 2. 능력치 숫자 가져오기
        // HTML에 적혀있는 '95,55,45...' 같은 숫자를 가져와서, 0~100 사이의 숫자로 안전하게 바꿉니다.
        const rawStats  = wrapper.getAttribute('data-stats') || '50,50,50,50,50,50,50,50';
        const stats     = rawStats.split(',')
            .map(s => Math.min(100, Math.max(0, parseFloat(s.trim()) || 0)));

        // 3. 캐릭터 고유 색상 가져오기
        const rawColor  = (wrapper.getAttribute('data-color') || '229, 197, 109').trim();

        // 4. 원래 그려져 있던 그림 싹 지우기 (초기화)
        svg.innerHTML = '';

        // ── 레이어 1: 배경 거미줄 (동심 팔각형 5개 + 뻗어나가는 뼈대 선) ────────
        const bgG = el('g', { class: 'chart-background' });

        // 5칸짜리 거미줄 배경을 그립니다.
        for (let lv = 1; lv <= 5; lv++) {
            const r   = (R / 5) * lv; // 중심에서부터의 거리
            const pts = Array.from({ length: N }, (_, i) => {
                const { x, y } = pt(i, r);
                return `${x},${y}`;
            }).join(' ');
            
            // 거미줄 가로선 그리기
            bgG.appendChild(el('polygon', {
                points: pts,
                fill: 'none',
                stroke: 'rgba(255,255,255,0.12)', // 반투명한 흰색 선
                'stroke-width': lv === 5 ? '1' : '0.6' // 맨 바깥쪽 선만 살짝 굵게
            }));
        }

        // 중심에서 바깥으로 뻗어나가는 8개의 뼈대 선을 그립니다.
        for (let i = 0; i < N; i++) {
            const { x, y } = pt(i, R);
            bgG.appendChild(el('line', {
                x1: CX, y1: CY, x2: x, y2: y,
                stroke: 'rgba(255,255,255,0.12)',
                'stroke-width': '0.6'
            }));
        }
        svg.appendChild(bgG); // 도화지에 거미줄 붙이기

        // ── 레이어 2: 능력치 모양 (색칠된 면적) ───────────────────────────────
        // 100점 만점을 기준으로 반지름(R) 내에서 얼마나 뻗어나갈지 계산합니다.
        const radii     = stats.map(v => (v / 100) * R);
        const dataG     = el('g', { class: 'chart-data' });
        const polygon   = el('polygon', {
            points:         toPoints(radii), // 계산된 점들을 잇습니다.
            fill:           `rgba(${rawColor}, 0.35)`, // 반투명하게 색칠하기
            stroke:         `rgb(${rawColor})`,        // 진하게 테두리 긋기
            'stroke-width': '1.5',
            'stroke-linejoin': 'round' // 모서리를 둥글게
        });
        dataG.appendChild(polygon);
        svg.appendChild(dataG); // 도화지에 능력치 모양 붙이기

        // ── 레이어 3: 글씨 라벨 ('근력', '민첩' 등) ────────────────────────
        const lblG = el('g', { class: 'chart-labels' });
        LABELS.forEach((name, i) => {
            // 거미줄 밖으로 살짝(17픽셀) 띄워서 글씨 위치를 잡습니다.
            const { x, y } = pt(i, R + 17);
            const txt = el('text', {
                x, y,
                'text-anchor': 'middle',       // 글씨 가운데 정렬
                'dominant-baseline': 'middle', // 글씨 세로 중앙 정렬
                'font-size': '9.5',            // 글자 크기
                'font-weight': 'bold',         // 굵게
                fill: '#aaa'                   // 회색빛 글자
            });
            txt.textContent = name;
            lblG.appendChild(txt);
        });
        svg.appendChild(lblG);

        // ── 레이어 4: 꼭짓점 동그라미 및 마우스 인식 영역 ──────────────────
        const dotsG = el('g', { class: 'chart-dots' });
        radii.forEach((r, i) => {
            const { x, y } = pt(i, r);

            // 1. 눈에 보이는 진짜 꼭짓점 동그라미입니다.
            dotsG.appendChild(el('circle', {
                cx: x, cy: y, r: '3.5', // 반지름 3.5픽셀
                fill:          `rgb(${rawColor})`,
                stroke:        '#1a1817', // 어두운 테두리
                'stroke-width': '1.2'
            }));

            // 2. 마우스를 갖다 대기 쉽게 만들어주는 '보이지 않는 큰 동그라미'입니다.
            // 점이 너무 작으면 마우스로 찌르기 힘드니까, 큼직하게 만들고 투명하게 숨겨둡니다.
            const hit = el('circle', {
                cx: x, cy: y, r: '13',
                fill:  'transparent',
                class: 'dot-hit',
                style: 'cursor:pointer'
            });
            
            // 툴팁(마우스 올리면 나오는 설명창)에 쓸 정보들을 몰래 숨겨둡니다.
            hit.dataset.label = LABELS[i];
            hit.dataset.value = Math.round(stats[i]);
            hit.dataset.cx    = x;
            hit.dataset.cy    = y;
            dotsG.appendChild(hit);
        });
        svg.appendChild(dotsG);

        // ── 레이어 5: 툴팁 (마우스를 올렸을 때 뜨는 검은색 설명창) ────────
        // 처음엔 숨겨둡니다 (display:none)
        const tipG = el('g', {
            class: 'chart-tooltip',
            style: 'display:none; pointer-events:none'
        });
        // 툴팁의 검은 배경 네모 상자입니다.
        const tipRect = el('rect', {
            rx: '4', ry: '4', // 모서리를 4픽셀 둥글게
            fill:           'rgba(10,10,10,0.92)',
            stroke:         `rgba(${rawColor},0.7)`,
            'stroke-width': '1'
        });
        // 툴팁 안에 들어갈 하얀 글씨입니다.
        const tipText = el('text', {
            'text-anchor':      'middle',
            'dominant-baseline':'central',
            'font-size':        '11',
            'font-weight':      'bold',
            fill:               '#ffffff',
            'paint-order':      'stroke',
            stroke:             'rgba(0,0,0,0.6)',
            'stroke-width':     '3'
        });
        tipG.appendChild(tipRect);
        tipG.appendChild(tipText);
        svg.appendChild(tipG);

        // ── 4. 마우스 이벤트 (올리기 / 떼기) ───────────────────────────
        
        // 투명한 큰 동그라미에 마우스를 올렸을 때의 행동입니다.
        dotsG.addEventListener('mouseover', function (e) {
            const t = e.target;
            if (!t.classList.contains('dot-hit')) return; // 투명 동그라미가 아니면 무시

            // 아까 몰래 숨겨둔 글자와 숫자를 가져와서 조합합니다. (예: "근력 : 95")
            const label   = t.dataset.label;
            const value   = t.dataset.value;
            const hx      = parseFloat(t.dataset.cx);
            const hy      = parseFloat(t.dataset.cy);
            const content = `${label} : ${value}`;

            tipText.textContent = content; // 툴팁 글자 갱신

            // 글자 길이에 맞춰서 툴팁 네모 상자의 가로 길이를 고무줄처럼 늘려줍니다.
            const w = content.length * 6.8 + 20;
            const h = 22;

            tipRect.setAttribute('width',  w);
            tipRect.setAttribute('height', h);
            tipRect.setAttribute('x',      -(w / 2));
            tipRect.setAttribute('y',      -(h / 2));

            // 화면 천장을 뚫고 나가지 않도록, 윗부분 점이면 툴팁을 점 아래에 띄워줍니다.
            const tipY = hy < 30 ? hy + 28 : hy - 28;
            
            // 툴팁 위치를 이동시키고 화면에 보여줍니다.
            tipG.setAttribute('transform', `translate(${hx}, ${tipY})`);
            tipG.style.display = '';
        });

        // 마우스를 뗐을 때의 행동입니다. (툴팁 숨기기)
        dotsG.addEventListener('mouseout', function (e) {
            if (e.target.classList.contains('dot-hit')) {
                tipG.style.display = 'none';
            }
        });
    }

    // ────────────────────────────────────────────────────────────
    // 5. 외부에서 이 기능들을 쓸 수 있게 열어두기 (공개 API)
    // ────────────────────────────────────────────────────────────

    /**
     * 명령 한 번으로 화면에 있는 모든 능력치 레이더 차트를 한꺼번에 다 그려줍니다.
     */
    window.drawAllRadarCharts = function (root) {
        (root || document).querySelectorAll('.stats-wrapper').forEach(drawOne);
    };

    /**
     * 딱 집어서 하나만 그리고 싶을 때 씁니다.
     */
    window.drawRadarChart = function (svgElement) {
        const wrapper = svgElement && svgElement.closest('.stats-wrapper');
        if (wrapper) drawOne(wrapper);
    };

})();