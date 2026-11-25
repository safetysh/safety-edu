import os
import re
import sys
import time
import json
import argparse
from collections import Counter
from urllib.parse import unquote

URLS = [
    "https://apis.data.go.kr/B552468/disaster_api02/getdisaster_api02",
    "http://apis.data.go.kr/B552468/disaster_api02/getdisaster_api02",
]
TARGET_BUSINESSES = ["건설업", "제조업", "서비스업"]
PER_BUSINESS_LIMIT = 500
NUM_OF_ROWS = 100
OUTPUT_PATH = "public/data/accidents_db_lite.json"
EXCLUDE_KEYWORDS = ["공공데이터 서비스", "사고예방가이드", "공지사항", "이용안내", "게시판 정보"]

TITLE_SCORE_WEIGHT = 2.5
BODY_SCORE_WEIGHT = 1.0

TEMPLATES = {
    "떨어짐": {
        "measures": [
            "높이 2m 이상 고소작업 시 작업발판·안전난간·추락방호망 우선 설치",
            "안전대 부착설비 확보 및 안전대 고리 체결 상태 작업 전 필수 확인",
            "지붕 채광창·개구부 덮개 고정 및 폭 30cm 이상 안전발판 설치",
            "이동식 비계·사다리·고소작업대 아웃트리거 고정 및 2인 1조 준수",
        ],
        "tbm": [
            "작업발판과 상부·중간 안전난간이 견고히 고정되었는가?",
            "안전대 부착설비(구명줄) 설치 및 안전고리 체결 준비가 되었는가?",
            "채광창·개구부 덮개 고정 또는 하부 추락방호망을 확인했는가?",
            "고소작업대·사다리 아웃트리거 및 바퀴 잠금 상태를 확인했는가?",
            "안전모 턱끈 체결 및 미끄럼 방지 안전화를 착용했는가?",
        ],
        "ox": [
            {"wrong": "잠깐 올라가서 확인만 할 건데 안전고리 없이 가자", "right": "단 5분 고소작업이라도 안전난간 확보 및 안전고리 체결 필수"},
            {"wrong": "채광창이나 미고정 자재 위를 밟고 지나가자", "right": "취약 부재는 덮개·발판 설치 후 지정 통로로만 이동"},
        ],
        "slogan": "발판 확보! 난간 설치! 안전고리 체결 전 고소작업 금지!",
        "legal": "산업안전보건기준에 관한 규칙 제42조·제45조(추락·지붕 위험 방지)",
        "related": ["고소작업대·설비 보수", "건물 시설관리·조명 교체"],
    },
    "끼임_설비": {
        "measures": [
            "정비·청소·이물질 제거·에러 확인 전 반드시 설비 운전 정지",
            "주전원 차단 후 잠금장치(LOTO) 체결 및 작업중 조작금지 표지 부착",
            "회전체·로봇·차단문 인터록 및 방호덮개 임의 해제 절대 금지",
            "위험점 직접 신체 진입 금지 및 전용 수공구 사용",
        ],
        "tbm": [
            "설비 주전원을 완전 차단하고 잔류 동력·회전 정지를 확인했는가?",
            "LOTO 잠금장치 및 '작업 중 조작금지' 표지판을 부착했는가?",
            "인터록·광전자식 방호장치 및 덮개가 정상 작동하는가?",
            "비상정지 스위치 위치를 작업자 전원이 숙지했는가?",
            "맨손 대신 전용 이물질 제거 수공구를 준비했는가?",
        ],
        "ox": [
            {"wrong": "자동 설비 에러만 잠깐 확인하고 나오면 괜찮아", "right": "에러 확인·이물질 제거도 무조건 운전정지 + LOTO 잠금 후 진입"},
            {"wrong": "센서가 감지해 멈춰 있으니 손을 넣어도 안전해", "right": "센서 오작동 시 불시 가동 위험, 주전원 차단 후 전용 도구 사용"},
        ],
        "slogan": "멈추고! 잠그고! 확인한 뒤에 손대자! (LOTO 필수)",
        "legal": "산업안전보건기준에 관한 규칙 제92조(정비 등의 작업 시의 운전정지)",
        "related": ["컨베이어·회전체 점검/청소", "폐기물 파쇄·압축기 작업"],
    },
    "끼임_장비": {
        "measures": [
            "고소작업대·지게차·리프트 이동·조작 시 상부 구조물 및 주변 장애물 사전 확인",
            "과상승방지장치(협착방지대) 정상 작동 확인 및 상부 시야 확보",
            "장비 아웃트리거·유압장치 조작 시 반경 내 신체 접근 절대 금지",
            "승강기·리프트 점검 시 추락·낙하 방지용 고정핀·지지대 체결 및 전원 차단",
        ],
        "tbm": [
            "장비 이동 경로의 상부 보·출입구 높이 및 수로·단차를 확인했는가?",
            "고소작업대 과상승방지장치(협착방지대)가 정상 작동하는가?",
            "아웃트리거·후진 조작 전 주변 작업자 대피 및 신호수 배치를 확인했는가?",
            "리프트·승강기 수리 전 전원 차단 및 운반구 낙하방지 고정을 완료했는가?",
            "운전자·보조자 간 명확한 수신호·무전 체계를 약속했는가?",
        ],
        "ox": [
            {"wrong": "고소작업대 탄 채로 위를 안 보고 후진·이동하자", "right": "이동 전 상부 장애물 확인 및 유도자 배치 후 저속 이동"},
            {"wrong": "걸린 리프트를 발로 차서 강제로 내리자", "right": "주전원 차단 및 안전지지대 설치 후 전문 절차에 따라 정비"},
        ],
        "slogan": "상부 장애물 확인! 장비 가동 반경 신체 접근 절대 금지!",
        "legal": "산업안전보건기준에 관한 규칙 제186조(고소작업대)·제172조(접촉 방지)",
        "related": ["지게차·물류 하역 작업", "고소작업대·설비 보수"],
    },
    "부딪힘": {
        "measures": [
            "지게차·화물차 작업구역과 보행자 통로 물리적 분리 및 출입 통제",
            "후진 및 시야 사각지대 구간에 신호수(유도자) 필수 배치",
            "후진 경보음·경광등·블루스팟·후방카메라 정상 작동 일일 점검",
            "사내 제한속도(10km/h 이하) 준수 및 운전자 좌석 안전띠 착용",
        ],
        "tbm": [
            "차량·지게차 통로와 보행자 통로가 명확히 분리되었는가?",
            "후진·교차로·시야 불량 구간에 신호수가 배치되었는가?",
            "후진 경보음·블루스팟·브레이크 작동 상태를 점검했는가?",
            "전방 시야를 가리는 과적 상태가 아닌지 확인했는가?",
            "장비 정차 시 바퀴 고임목 설치 및 시동 차단 원칙을 공유했는가?",
        ],
        "ox": [
            {"wrong": "화물을 높이 실어도 천천히 앞으로 가면 괜찮아", "right": "전방 시야 불량 시 반드시 후진 주행 및 신호수 유도 하에 이동"},
            {"wrong": "쉬는 시간이니 지게차 통로로 빠르게 가로질러 가자", "right": "휴게·이동 시간에도 지정된 보행자 통로만 이용"},
        ],
        "slogan": "장비 반경 접근 금지! 사람과 차의 길을 확실히 나누자!",
        "legal": "산업안전보건기준에 관한 규칙 제172조(접촉의 방지)",
        "related": ["물류창고 상하차·지게차 작업", "지게차·물류 하역 작업"],
    },
    "깔림·뒤집힘": {
        "measures": [
            "톤백·중량물 다단 적재 시 허용 단수 준수 및 전도방지 조치 실시",
            "화물차 고정 벨트(슬링) 해체 전 적재물 흔들림·기울어짐 사전 확인",
            "크레인 달기구·굴착기 버킷 작업 반경 내 근로자 출입 절대 통제",
            "대차·중량 설비 운반 시 바닥 단차·레일 제거 및 전도방지 지그 사용",
        ],
        "tbm": [
            "적재물(톤백·자재) 기울어짐 여부와 적정 적재 높이를 확인했는가?",
            "화물 고정벨트 해체 전 적재물 쏠림 위험 방향에 작업자가 없는가?",
            "장비 인양·하강 반경 내 출입통제 및 신호수 배치가 완료되었는가?",
            "중량물 이동 경로의 레일·단차·장애물을 사전 제거했는가?",
            "전도 위험 시 손으로 막지 않고 즉시 대피할 동선을 확보했는가?",
        ],
        "ox": [
            {"wrong": "기울어진 톤백·설비를 몸으로 잠깐 받쳐 세우자", "right": "중량물 전도 징후 시 절대 몸으로 막지 말고 즉시 안전구역 대피"},
            {"wrong": "화물 고정줄을 한 번에 다 풀고 빠르게 하차하자", "right": "전도 위험 확인 후 보조 지지 확보 상태에서 순차적으로 해체"},
        ],
        "slogan": "중량물 하부·전도 반경 출입 금지! 기울면 즉시 대피!",
        "legal": "산업안전보건기준에 관한 규칙 제38조(작업계획서)·제173조",
        "related": ["지게차·물류 하역 작업", "타워크레인·양중 작업"],
    },
    "붕괴·무너짐": {
        "measures": [
            "굴착 깊이 1.5m 이상 시 적정 굴착면 기울기 준수 또는 흙막이 지보공 설치",
            "굴착 작업 전 지반 균열·용수·배면 상부 중량물 적재 여부 점검",
            "굴착면 하부 작업 시 상부 굴착기·장비 동시 작업 금지 및 감시자 배치",
            "우수·지하수 유입 시 즉시 작업 중지 및 배수 조치 후 재개",
        ],
        "tbm": [
            "굴착 사면 기울기 기준 또는 흙막이 지보공 설치가 완료되었는가?",
            "굴착면 상단 부근에 토사·자재·장비 등 과하중이 놓여있지 않은가?",
            "사면 균열·토사 흘러내림·지하수 용출 징후를 확인했는가?",
            "상부 장비 작업과 하부 인력 작업이 완전히 분리되었는가?",
            "이상 징후 시 즉시 탈출할 비상 승강 사다리가 설치되었는가?",
        ],
        "ox": [
            {"wrong": "깊이가 깊지 않으니 흙막이 없이 빨리 관로만 묻고 나오자", "right": "1.5m 이상 굴착 시 예외 없이 적정 기울기 또는 간이 흙막이 설치"},
            {"wrong": "위에서 굴착기가 흙을 내릴 때 아래에서 미리 수평을 맞추자", "right": "장비 작업 반경 내 인력 동시 작업 절대 금지"},
        ],
        "slogan": "흙막이 없이 굴착 진입 금지! 상·하 동시작업 절대 금지!",
        "legal": "산업안전보건기준에 관한 규칙 제338조·제340조(굴착면 기울기·붕괴 방지)",
        "related": ["굴착·가시설 토목 작업", "타워크레인·양중 작업"],
    },
    "맞음_굴착토사": {
        "measures": [
            "굴착기·장비의 되메우기·토사 투하 작업 반경 내 근로자 출입 절대 금지",
            "상부 굴착기 작업과 하부 수평맞추기·정리 인력 작업의 시간·공간 완전 분리",
            "토사 투하 구역에 전담 신호수 배치 및 운전원-신호수 무전·수신호 체계 확립",
            "흙막이 배면 상단 토사 과적 금지 및 낙하 위험 구간 출입통제선 설치",
        ],
        "tbm": [
            "굴착기 작업 반경 내 하부 인력이 완전히 철수한 후 토사를 투하하는가?",
            "상부 장비 작업과 하부 인력 정리 작업을 교대(분리) 진행하기로 약속했는가?",
            "굴착기 운전원 사각지대를 감시할 전담 신호수가 안전 위치에 배치되었는가?",
            "흙막이 배면 상단에 토사·자재가 흘러내릴 위험은 없는가?",
            "안전모 턱끈 체결 및 비상 대피 동선을 전원이 확인했는가?",
        ],
        "ox": [
            {"wrong": "굴착기가 위에서 흙을 부을 때 아래에서 바로 수평을 맞추자", "right": "장비 토사 투하 중 하부 진입 절대 금지, 장비 정지 후 인력 투입"},
            {"wrong": "신호수 없이 운전원이 눈대중으로 아래를 보며 작업하자", "right": "사각지대가 큰 굴착부 작업은 반드시 전담 신호수 지시에 따라 가동"},
        ],
        "slogan": "장비 투하 중 하부 진입 금지! 상·하 동시작업 절대 엄금!",
        "legal": "산업안전보건기준에 관한 규칙 제200조(접촉의 방지)·제14조(낙하물 방지)",
        "related": ["굴착·가시설 토목 작업", "타워크레인·양중 작업"],
    },
    "맞음_인양달기구": {
        "measures": [
            "크레인·윈치 인양 전 와이어로프·슬링벨트·클립 마모·손상 및 안전율 점검",
            "인양물 하부 및 장력 방향(파단 시 튕김 반경) 내 근로자 출입 통제",
            "정격 하중 준수 및 편하중·이탈 방지용 2줄 걸이·해지장치 체결 확인",
            "인양물 유도 시 맨손 접촉 금지 및 충분한 길이의 유도줄 사용",
        ],
        "tbm": [
            "슬링벨트·와이어로프·클립의 헤짐·풀림·변형 여부를 점검했는가?",
            "인양물 하부 및 와이어 파단 반경에 출입통제선을 설치했는가?",
            "훅 해지장치 정상 작동 및 줄걸이 균형 체결 상태를 확인했는가?",
            "인양물 유도 시 맨손 대신 전용 유도줄을 사용하고 있는가?",
            "신호수 지정 및 표준 수신호 체계를 전원이 숙지했는가?",
        ],
        "ox": [
            {"wrong": "슬링벨트가 살짝 헤졌지만 가벼운 자재니 한 번만 더 쓰자", "right": "손상된 달기구는 즉시 폐기하고 정격 인증 제품만 사용"},
            {"wrong": "인양물 바로 아래에서 손으로 잡고 위치를 맞추자", "right": "인양물 하부 출입 금지, 안전거리에서 유도줄로 제어"},
        ],
        "slogan": "달기구 사전 점검! 인양물 하부·와이어 반경 출입 금지!",
        "legal": "산업안전보건기준에 관한 규칙 제140조·제163조(양중기·달기구 안전기준)",
        "related": ["타워크레인·양중 작업", "지게차·물류 하역 작업"],
    },
    "맞음_낙하비래": {
        "measures": [
            "상부 작업 구역 하부에 출입금지 구역 설정 및 낙하물방지망·방호선반 설치",
            "외벽 마감재·공구·자재 낙하 방지를 위한 공구걸이 체결 및 자재 결속 철저",
            "압력 배관·수압시험·벌목 작업 시 비래·회전 반경 밖 안전거리 확보",
            "상·하 동시 작업 원칙 금지 및 안전모 턱끈 단단히 체결",
        ],
        "tbm": [
            "상부 작업 구역 아래에 통제선·낙하물방지망이 설치되었는가?",
            "고소 작업 공구와 마감 자재(석재·볼트 등)가 떨어지지 않게 고정되었는가?",
            "압력 배관·벌목 등 비래 위험 반경 내에 작업자가 없는가?",
            "상부와 하부 작업이 동시에 진행되지 않도록 일정을 분리했는가?",
            "작업자 전원 안전모 턱끈 및 보안경 등 보호구를 착용했는가?",
        ],
        "ox": [
            {"wrong": "안전모 썼으니 위에서 외벽 작업할 때 아래서 창호를 달자", "right": "상·하 동시작업 절대 금지, 하부 출입 통제 완료 후 상부 작업 개시"},
            {"wrong": "수압시험 배관 캡이 살짝 느슨해도 압력 켠 채로 조이자", "right": "반드시 내부 압력(잔압) 완전 제거 후 정비·체결 실시"},
        ],
        "slogan": "상·하 동시작업 금지! 낙하·비래 위험 반경 출입 통제!",
        "legal": "산업안전보건기준에 관한 규칙 제14조(낙하물에 의한 위험 방지)",
        "related": ["철골·지붕 고소 작업", "건물 시설관리·조명 교체"],
    },
    "화재·폭발": {
        "measures": [
            "인화성 물질(신너·희석제 등) 취급 구역 반경 11m 이내 용접·화기작업 엄금",
            "화학설비·배관 플랜지 해체 전 내부 고온 응축수·잔류가스 완전 배출 및 냉각",
            "화기작업 전 가연물 제거·불티비산방지포 설치·소화기 비치 및 화재감시자 배치",
            "작업 전 가스농도 측정 및 충분한 강제 환기 실시",
        ],
        "tbm": [
            "작업 반경 내 신너·유기용제 등 인화성 물질을 완전히 격리했는가?",
            "용접·용단 시 불티비산방지포 설치와 소화기 비치를 완료했는가?",
            "배관·탑 플랜지 개방 전 내부 압력·고온 유체 완전 배출을 확인했는가?",
            "화재감시자 배치 및 작업 종료 후 잔불 확인 계획을 세웠는가?",
            "내열·내화학 보호복과 보안면 등 전용 보호구를 착용했는가?",
        ],
        "ox": [
            {"wrong": "조금 떨어진 곳에서 용접하니 여기서 신너로 닦아도 괜찮아", "right": "유증기는 멀리 퍼지므로 화기작업과 인화성 물질 작업 동시 금지"},
            {"wrong": "운전 멈췄으니 플랜지 볼트를 바로 풀어서 청소하자", "right": "반드시 내부 온도·압력 확인 및 드레인(완전 배출) 후 개방"},
        ],
        "slogan": "화기·인화물 동시 작업 절대 금지! 설비 개방 전 잔압·고온 확인!",
        "legal": "산업안전보건기준에 관한 규칙 제239조·제241조(화재·화기작업 위험 방지)",
        "related": ["화학물질·밀폐탱크 작업", "밀폐공간·양생 작업"],
    },
    "감전": {
        "measures": [
            "전기·통신케이블 점검 및 충전부 인근 작업 전 반드시 전원 차단 및 검전 확인",
            "차단기 잠금장치(LOTO) 체결 및 충전부 절연용 방호구 설치",
            "전동공구·이동전선 피복 손상 점검 및 누전차단기(ELB) 정상 작동 확인",
            "절연장갑·절연화·절연모 등 인증 절연보호구 필수 착용",
        ],
        "tbm": [
            "작업 구간의 주전원을 차단하고 검전기로 무전압을 확인했는가?",
            "변압기·충전부 인근에 절연방호구와 접근금지 표지를 설치했는가?",
            "분전반 누전차단기(ELB) 테스트 버튼이 정상 작동하는가?",
            "전선 피복 손상 및 습기·물기 노출 여부를 점검했는가?",
            "절연장갑·절연화 등 적정 절연보호구를 착용했는가?",
        ],
        "ox": [
            {"wrong": "통신선 작업이니 옆 변압기 전원 안 꺼도 닿지만 않으면 돼", "right": "충전부 인근 작업 시 반드시 정전 조치 또는 절연방호구 설치"},
            {"wrong": "스위치 내렸으니 검전기 확인 없이 바로 만지자", "right": "차단 후에도 반드시 검전기로 무전압 확인 및 LOTO 잠금"},
        ],
        "slogan": "전원 차단! 검전 확인! 절연 보호구 없이 충전부 접근 금지!",
        "legal": "산업안전보건기준에 관한 규칙 제319조·제321조(정전작업·충전전로 인근작업)",
        "related": ["건물 시설관리·조명 교체", "고소작업대·설비 보수"],
    },
    "질식·중독": {
        "measures": [
            "밀폐공간(탱크·맨홀·저수조·양생장) 출입 전 산소(18~23.5%)·유해가스 농도 측정",
            "작업 전·중 지속적인 강제 환기 실시 및 외부 감시인 상시 배치",
            "유해가스 발생 우려 시 송기마스크 등 호흡보호구 및 구명줄 착용",
            "동료 쓰러짐 발견 시 맨몸 구조 진입 절대 금지, 119 신고 및 보호구 착용 구조",
        ],
        "tbm": [
            "출입 직전 산소·일산화탄소·황화수소 농도를 측정·기록했는가?",
            "환기팬을 가동해 작업 중에도 연속 환기가 유지되고 있는가?",
            "외부 감시인이 배치되어 무전·비상연락 체계를 유지하는가?",
            "송기마스크·구명줄·삼각대 등 비상 구조장비가 현장에 비치되었는가?",
            "이상 발생 시 맨몸 진입 금지 원칙을 전원이 숙지했는가?",
        ],
        "ox": [
            {"wrong": "냄새가 안 나고 잠깐 수위만 볼 거니 그냥 들어가자", "right": "산소결핍·일산화탄소는 무색무취, 반드시 측정·환기 후 출입"},
            {"wrong": "동료가 쓰러졌으니 빨리 숨 참고 들어가서 꺼내자", "right": "2차 동반 질식 위험! 119 신고 후 공기호흡기 착용 상태에서만 구조"},
        ],
        "slogan": "측정하고! 환기하고! 감시인 없으면 밀폐공간 출입 금지!",
        "legal": "산업안전보건기준에 관한 규칙 제619조(밀폐공간 작업 프로그램)",
        "related": ["밀폐공간·양생 작업", "화학물질·밀폐탱크 작업"],
    },
}

# Domain scoring rules: each entry is (work_type, [(keyword, domain_weight), ...]).
# Title matches receive TITLE_SCORE_WEIGHT (2.5x) and body matches receive BODY_SCORE_WEIGHT (1.0x).
WORK_TYPE_DOMAIN_RULES = {
    "건설현장": [
        (
            "이동식 비계·사다리 작업",
            [
                ("이동식 비계", 3.0), ("시스템 비계", 3.0), ("강관비계", 2.8), ("외부비계", 2.8),
                ("달비계", 3.0), ("말비계", 3.0), ("이동식 사다리", 3.0), ("A형 사다리", 3.0),
                ("비계", 2.2), ("사다리", 2.4), ("작업발판", 1.8), ("우마", 2.2),
            ],
        ),
        (
            "굴착·가시설 토목 작업",
            [
                ("굴착기", 2.4), ("굴착", 2.8), ("토사", 2.6), ("매몰", 2.8), ("흙막이", 3.0),
                ("지보공", 2.8), ("거푸집", 2.6), ("알폼", 2.8), ("갱폼", 2.8), ("동바리", 2.8),
                ("관로", 2.4), ("되메우기", 2.8), ("사면", 2.2), ("옹벽", 2.4), ("석축", 2.4),
                ("기초공사", 2.2), ("토목", 2.0), ("항타기", 2.6), ("파일", 2.0), ("크램쉘", 2.6),
                ("롤러", 1.8), ("다짐", 1.8), ("불도저", 2.4), ("덤프트럭", 2.0),
            ],
        ),
        (
            "철골·지붕 고소 작업",
            [
                ("지붕", 2.8), ("채광창", 3.0), ("선라이트", 3.0), ("슬레이트", 2.8),
                ("철골", 2.8), ("데크플레이트", 3.0), ("트러스", 2.6), ("캐노피", 2.6),
                ("창호", 2.4), ("외벽", 2.4), ("고소작업대", 2.8), ("고소작업차", 2.8),
                ("스카이차", 2.6), ("개구부", 2.2), ("슬래브", 2.0), ("발코니", 2.2),
                ("옥상", 2.2), ("천장", 1.8), ("거더", 2.4), ("교량", 2.0),
            ],
        ),
        (
            "타워크레인·양중 작업",
            [
                ("타워크레인", 3.2), ("이동식 크레인", 3.0), ("크레인", 2.6), ("양중", 2.8),
                ("인양", 2.6), ("슬링벨트", 2.8), ("슬링", 2.4), ("와이어로프", 2.6),
                ("호이스트", 2.8), ("건설용 리프트", 3.0), ("리프트", 2.4), ("윈치", 2.4),
                ("달기구", 2.6), ("줄걸이", 2.6), ("지게차", 2.4), ("펌프카", 2.6),
                ("믹서트럭", 2.2), ("레미콘", 2.0), ("하역", 2.2), ("상차", 2.0), ("하차", 2.0),
            ],
        ),
        (
            "밀폐공간·양생 작업",
            [
                ("밀폐공간", 3.2), ("밀폐", 2.8), ("양생", 3.0), ("갈탄", 3.2), ("열풍기", 2.6),
                ("일산화탄소", 3.0), ("산소결핍", 3.0), ("황화수소", 3.0), ("맨홀", 2.8),
                ("정화조", 2.8), ("집수정", 2.8), ("저수조", 2.8), ("피트", 2.2),
                ("질식", 2.8), ("중독", 2.6), ("방수", 2.2), ("도장", 2.0), ("유기용제", 2.6),
                ("신너", 2.6), ("용접", 2.2), ("용단", 2.2), ("화재", 2.0), ("폭발", 2.2),
            ],
        ),
    ],
    "제조업": [
        (
            "컨베이어·회전체 점검/청소",
            [
                ("컨베이어", 3.0), ("회전체", 3.0), ("회전기계", 3.0), ("롤러", 2.6),
                ("롤에", 2.6), ("교반기", 2.8), ("혼합기", 2.8), ("배합기", 2.8),
                ("분쇄기", 2.8), ("파쇄기", 2.8), ("분쇄", 2.4), ("선별기", 2.8),
                ("스크류", 2.6), ("체인", 2.0), ("기어", 2.2), ("구동부", 2.4),
                ("산업용 로봇", 3.0), ("로봇", 2.6), ("차단문", 2.4), ("원심분리기", 2.8),
                ("초지", 2.4), ("압연", 2.4), ("권취기", 2.6), ("이물질 제거", 2.2), ("말림", 2.2),
            ],
        ),
        (
            "프레스·절곡·전단기 작업",
            [
                ("프레스", 3.2), ("절곡기", 3.2), ("절곡", 2.8), ("전단기", 3.2), ("전단", 2.6),
                ("사출성형기", 3.0), ("사출기", 3.0), ("사출", 2.6), ("성형기", 2.8),
                ("금형", 2.8), ("선반", 2.6), ("밀링", 2.8), ("보링", 2.8), ("머시닝센터", 2.8),
                ("드릴기", 2.8), ("천공기", 2.6), ("천공", 2.2), ("절단기", 2.6), ("톱기계", 2.8),
                ("연삭기", 2.8), ("그라인더", 2.6), ("가공기", 2.6), ("단조", 2.6), ("볼밀", 2.6),
            ],
        ),
        (
            "지게차·물류 하역 작업",
            [
                ("지게차", 3.2), ("하역", 2.8), ("상하차", 2.8), ("상차", 2.4), ("하차", 2.4),
                ("하적단", 3.0), ("적재", 2.2), ("적치", 2.0), ("톤백", 2.8), ("파렛트", 2.6),
                ("팔레트", 2.6), ("대차", 2.6), ("컨테이너", 2.4), ("트레일러", 2.6),
                ("화물자동차", 2.6), ("화물차", 2.4), ("천장크레인", 2.8), ("호이스트", 2.6),
                ("크레인", 2.4), ("인양", 2.2), ("슬링", 2.2), ("운반", 2.0), ("입고", 2.0), ("출고", 2.0),
            ],
        ),
        (
            "고소작업대·설비 보수",
            [
                ("고소작업대", 3.2), ("시저형", 2.8), ("이동식 사다리", 3.0), ("A형 사다리", 3.0),
                ("사다리", 2.6), ("지붕", 2.8), ("채광창", 3.0), ("선라이트", 3.0),
                ("플랫폼", 2.4), ("작업발판", 2.4), ("개구부", 2.4), ("비계", 2.4),
                ("리프트", 2.4), ("승강기", 2.4), ("천장조명", 2.8), ("조명", 2.2),
                ("실린더", 2.4), ("배관", 2.0), ("변압기", 2.6), ("분전반", 2.6),
                ("전선", 2.2), ("감전", 2.4), ("보수", 1.8), ("수리", 1.8), ("교체", 1.6),
            ],
        ),
        (
            "화학물질·밀폐탱크 작업",
            [
                ("저장탱크", 3.2), ("밀폐탱크", 3.2), ("탱크", 2.8), ("반응기", 3.0),
                ("화학설비", 3.2), ("화학물질", 3.0), ("유해화학", 3.0), ("화학", 2.4),
                ("응축수", 3.0), ("스팀", 2.4), ("용광로", 2.8), ("전기로", 2.8), ("용융물", 2.8),
                ("희석제", 3.0), ("신너", 3.0), ("유기용제", 3.0), ("인화성", 2.8),
                ("플랜지", 2.6), ("집진기", 2.6), ("세척", 2.2), ("도장", 2.0),
                ("산소결핍", 3.0), ("일산화탄소", 3.0), ("황화수소", 3.0), ("질식", 3.0),
                ("중독", 2.8), ("밀폐", 2.8), ("누출", 2.4), ("화상", 2.6), ("화재", 2.4), ("폭발", 2.6),
            ],
        ),
    ],
    "서비스업": [
        (
            "물류창고 상하차·지게차 작업",
            [
                ("물류창고", 3.2), ("물류센터", 3.2), ("물류", 2.6), ("창고", 2.4),
                ("상하차", 3.0), ("상차", 2.4), ("하차", 2.4), ("하역", 2.8),
                ("지게차", 3.2), ("오더피커", 3.2), ("리치스태커", 3.0), ("파렛트", 2.6),
                ("팔레트", 2.6), ("피킹", 2.8), ("적재대", 2.6), ("컨테이너", 2.4),
                ("선적", 2.6), ("부두", 2.4), ("항만", 2.4), ("계선", 2.4), ("톤백", 2.6), ("대차", 2.4),
            ],
        ),
        (
            "건물 시설관리·조명 교체",
            [
                ("조명", 3.0), ("시설관리", 3.0), ("빌딩", 2.4), ("아파트", 2.4), ("건물", 2.0),
                ("지붕", 2.6), ("채광창", 2.8), ("천장", 2.4), ("외벽", 2.4), ("옥상", 2.4),
                ("실외기", 3.0), ("에어컨", 2.8), ("배기", 2.6), ("공조기", 2.8), ("보일러", 2.6),
                ("엘리베이터", 3.2), ("승강기", 3.2), ("기계식주차", 3.0), ("주차설비", 3.0),
                ("사다리", 2.8), ("고소작업대", 2.8), ("이동식비계", 2.8), ("비계", 2.4),
                ("저수조", 3.0), ("정화조", 3.0), ("맨홀", 2.8), ("소방배관", 3.0), ("배관", 2.4),
                ("통신케이블", 3.0), ("전신주", 2.8), ("변압기", 2.8), ("분전반", 2.8), ("감전", 2.6),
                ("벌목", 2.8), ("벌도목", 3.0), ("임목", 2.8), ("수목", 2.8), ("가지치기", 3.0),
                ("전지작업", 3.0), ("전지", 2.6), ("예초기", 2.8), ("조경", 2.6), ("화단", 2.4), ("경비원", 2.4),
            ],
        ),
        (
            "폐기물 파쇄·압축기 작업",
            [
                ("폐기물", 3.2), ("쓰레기", 3.0), ("재활용", 3.0), ("파쇄기", 3.2), ("파쇄", 2.8),
                ("압축기", 3.2), ("압축", 2.6), ("분쇄기", 2.8), ("선별기", 2.8), ("컨베이어", 2.6),
                ("고철", 2.8), ("집게차", 3.0), ("암롤", 3.0), ("청소차", 3.0), ("수집차", 3.0),
                ("자동세차기", 2.8), ("세차기", 2.8), ("혼합기", 2.6), ("우드칩", 2.6),
                ("퇴비", 2.4), ("분뇨", 2.4), ("스키드로더", 2.6),
            ],
        ),
        (
            "주방·조리실 화상/절단 작업",
            [
                ("주방", 3.2), ("조리실", 3.2), ("조리", 3.0), ("음식점", 3.0), ("식당", 2.8),
                ("급식", 3.0), ("국솥", 3.2), ("튀김기", 3.2), ("열매체유", 3.0), ("육절기", 3.2),
                ("반죽기", 3.0), ("민서기", 3.0), ("절단기", 2.4), ("식품", 2.2), ("화상", 2.6),
            ],
        ),
        (
            "배달·이륜차 운행 작업",
            [
                ("배달", 3.2), ("택배", 3.0), ("배송", 3.0), ("우편", 2.8), ("이륜차", 3.2),
                ("오토바이", 3.2), ("사륜차", 2.8), ("견인", 3.0), ("구난차", 3.0),
                ("화물자동차", 2.4), ("화물차", 2.2), ("탑차", 2.6), ("운전석", 2.4),
                ("주행", 2.4), ("운행", 2.4), ("교차로", 2.4), ("도로", 2.0),
            ],
        ),
    ],
}

# Hazard-type fallback classifier when domain keyword score is 0
HAZARD_WORK_TYPE_FALLBACK = {
    "건설현장": {
        "떨어짐": "철골·지붕 고소 작업",
        "붕괴·무너짐": "굴착·가시설 토목 작업",
        "깔림·뒤집힘": "타워크레인·양중 작업",
        "물체에 맞음": "타워크레인·양중 작업",
        "끼임": "타워크레인·양중 작업",
        "부딪힘": "굴착·가시설 토목 작업",
        "화재·폭발": "밀폐공간·양생 작업",
        "질식·중독": "밀폐공간·양생 작업",
        "감전": "철골·지붕 고소 작업",
    },
    "제조업": {
        "떨어짐": "고소작업대·설비 보수",
        "감전": "고소작업대·설비 보수",
        "끼임": "컨베이어·회전체 점검/청소",
        "깔림·뒤집힘": "지게차·물류 하역 작업",
        "부딪힘": "지게차·물류 하역 작업",
        "물체에 맞음": "지게차·물류 하역 작업",
        "붕괴·무너짐": "지게차·물류 하역 작업",
        "화재·폭발": "화학물질·밀폐탱크 작업",
        "질식·중독": "화학물질·밀폐탱크 작업",
    },
    "서비스업": {
        "떨어짐": "건물 시설관리·조명 교체",
        "감전": "건물 시설관리·조명 교체",
        "물체에 맞음": "건물 시설관리·조명 교체",
        "질식·중독": "건물 시설관리·조명 교체",
        "끼임": "폐기물 파쇄·압축기 작업",
        "깔림·뒤집힘": "물류창고 상하차·지게차 작업",
        "붕괴·무너짐": "물류창고 상하차·지게차 작업",
        "부딪힘": "배달·이륜차 운행 작업",
        "화재·폭발": "주방·조리실 화상/절단 작업",
    },
}

WORK_TYPE_DEFAULT_EQUIP = {
    "이동식 비계·사다리 작업": "비계 및 작업발판",
    "굴착·가시설 토목 작업": "굴착 사면 및 가시설",
    "철골·지붕 고소 작업": "고소 구조물 및 개구부",
    "타워크레인·양중 작업": "양중기 및 인양 달기구",
    "밀폐공간·양생 작업": "밀폐공간 및 환기설비",
    "컨베이어·회전체 점검/청소": "회전 설비 및 구동부",
    "프레스·절곡·전단기 작업": "프레스·성형 가공설비",
    "지게차·물류 하역 작업": "하역·운반 설비 및 적재물",
    "고소작업대·설비 보수": "점검 설비 및 작업발판",
    "화학물질·밀폐탱크 작업": "화학설비 및 저장탱크",
    "물류창고 상하차·지게차 작업": "상하차 설비 및 적재화물",
    "건물 시설관리·조명 교체": "건물 설비 및 점검 작업대",
    "폐기물 파쇄·압축기 작업": "폐기물 파쇄·압축 설비",
    "주방·조리실 화상/절단 작업": "조리 설비 및 가열·절단기구",
    "배달·이륜차 운행 작업": "운행 차량 및 이륜차",
}

EQUIP_ALIASES = {
    "굴삭기": "굴착기",
    "고소작업차": "차량탑재형 고소작업대",
    "스카이차": "차량탑재형 고소작업대",
    "이동식비계": "이동식 비계",
    "시스템비계": "시스템 비계",
    "이동식사다리": "이동식 사다리",
    "A형사다리": "A형 사다리",
    "산업용로봇": "산업용 로봇",
    "유압성형프레스": "유압 성형 프레스",
}

EQUIP_LIST = sorted(
    [
        "차량탑재형 고소작업대", "시저형 고소작업대", "고소작업대", "고소작업차", "스카이차", "곤돌라",
        "시스템 비계", "이동식 비계", "강관비계", "외부비계", "달비계", "말비계", "비계",
        "A형 사다리", "이동식 사다리", "사다리", "작업발판",
        "채광창", "선라이트", "슬레이트 지붕", "샌드위치 패널", "지붕 패널", "지붕판넬", "PC판넬",
        "데크플레이트", "거푸집", "알폼", "갱폼", "동바리", "흙막이 지보공", "토류판",
        "크램쉘 버킷", "굴착기", "굴삭기", "불도저", "항타기", "스키드로더", "로더", "롤러",
        "천장크레인", "타워크레인", "이동식 크레인", "크레인", "호이스트", "윈치", "슬링벨트", "와이어로프",
        "지게차", "오더피커", "리치스태커", "전동대차", "대차", "톤백", "파렛트", "팔레트",
        "벨트 컨베이어", "셔틀컨베이어", "스크류 컨베이어", "컨베이어",
        "산업용 로봇", "유압 성형 프레스", "동력프레스", "프레스", "사출성형기", "사출기",
        "절곡기", "전단기", "절단기", "선반", "밀링기", "보링기", "드릴기", "천공기", "연삭기", "그라인더", "톱기계",
        "분쇄선별기", "자력선별기", "선별기", "파쇄기", "분쇄기", "압축기", "교반기", "상토혼합기", "혼합기", "배합기", "볼밀",
        "저장탱크", "반응기", "압력용기", "집진기", "화학설비", "용광로", "전기로", "보일러", "LPG 용기",
        "건설용 리프트", "산업용 리프트", "화물용 승강기", "엘리베이터", "승강기", "기계식 주차설비",
        "폐기물 수집차", "암롤박스", "집게차", "청소차", "자동세차기",
        "화물자동차", "트레일러", "덤프트럭", "믹서트럭", "펌프카", "탱크로리", "이륜차", "오토바이",
        "간접 가열식 국솥", "국솥", "튀김기", "육절기", "반죽기",
        "에어컨 실외기", "수변전 설비", "소방배관", "배관", "저수조", "정화조", "맨홀", "변압기", "분전반", "통신케이블",
        "예초기", "기계톱", "어선",
    ],
    key=lambda x: len(x.replace(" ", "")),
    reverse=True,
)

NON_EQUIP_STOPWORDS = {
    "작업", "이동", "운반", "운전", "점검", "보수", "수리", "해체", "설치", "정리", "청소",
    "상부", "하부", "내부", "외부", "바닥", "지상", "지하", "현장", "사업장", "공장", "창고",
    "재해자", "근로자", "작업자", "피재자", "동료", "운전자", "경비원", "물체", "중량물", "자재",
    "화물", "제품", "이물질", "더미", "사고", "발생", "과정", "주변", "인근", "사이", "방향",
    "도로", "통로", "계단", "해상", "수조", "공간", "부위", "상태", "원인", "확인", "위", "아래",
    "머리", "가슴", "다리", "복부", "신체", "얼굴", "손가락", "발목", "상체", "하반신", "전신", "몸",
    "일부", "및", "또는", "중", "시", "후", "전",
}

LEADING_MODIFIER_RE = re.compile(
    r"^(?:[가-힣0-9]+(?:하던|중인|중이던|하는|되는|된|한|던|아|어|여|고|며|면서|다가)\s+)+"
)

EQUIP_SUFFIX_RE = re.compile(
    r"([가-힣A-Za-z0-9·\-]{2,12}(?:\s+[가-힣A-Za-z0-9·\-]{2,10})?"
    r"(?:기계|설비|장치|탱크|배관|밸브|벨트|로프|비계|발판|리프트|크레인|컨베이어|"
    r"패널|판넬|슬래브|거푸집|동바리|보일러|차단기|차단문|변압기|전선|케이블|용기|선박|어선|창호|실린더|피더|"
    r"혼합기|파쇄기|압축기|분쇄기|선별기|교반기|절단기|연삭기|천공기|항타기|압쇄기|성형기|주입기|"
    r"작업대|적재대|적재함|지지대|운반차|차량|트럭|대차))"
)


def clean_text(text):
    t = re.sub(r"^[‘'\"`]+", "", (text or "").strip())
    t = re.split(r"\s*\*\s*[가-힣a-zA-Z]+:", t)[0]
    return re.sub(r"\s+", " ", t).strip()


def split_3lines(title, contents):
    c = clean_text(contents)
    m1 = re.match(
        r"^(.+?소재\s+[^\s]+(?:\s+[^\s]+){0,3}(?:에서|내에서|현장에서|공장에서|창고에서|사업장에서|야적장에서|농장에서|부두\s+내\s+[^\s]+에서))[,]?\s*(.+)$",
        c,
    )
    if m1:
        p1, rest = m1.group(1).strip().rstrip(","), m1.group(2).strip()
        m2 = re.search(r"(.+?(?:작업\s*중|이동\s*중|운반\s*중|운전\s*중|과정에서|순간|하던\s*중|하다가|되어|되면서))[,]?\s*(.+)", rest)
        if m2 and len(m2.group(1)) >= 10 and len(m2.group(2)) >= 8:
            return [p1, m2.group(1).strip().rstrip(","), m2.group(2).strip()]
        w = rest.split(" ")
        mid = max(1, len(w) // 2)
        return [p1, " ".join(w[:mid]), " ".join(w[mid:]) or title]
    w = c.split(" ")
    if len(w) >= 6:
        n = len(w)
        return [" ".join(w[: n // 3]), " ".join(w[n // 3 : 2 * n // 3]), " ".join(w[2 * n // 3 :])]
    return [title, c, "작업 전 안전점검 및 핵심 방호조치 미흡으로 재해 발생"]


def detect_hazard(title, contents):
    rules = [
        ("떨어짐", ["떨어짐", "추락", "빠짐"]),
        ("붕괴·무너짐", ["매몰", "붕괴", "무너"]),
        ("깔림·뒤집힘", ["깔림", "전도", "전복", "뒤집"]),
        ("끼임", ["끼임", "협착", "말림"]),
        ("물체에 맞음", ["맞음", "낙하", "파단되어", "비래"]),
        ("화재·폭발", ["화재", "폭발", "화상", "응축수"]),
        ("감전", ["감전", "충전부", "변압기"]),
        ("질식·중독", ["질식", "중독", "산소결핍", "일산화탄소"]),
        ("부딪힘", ["부딪힘", "충돌"]),
    ]
    for src in (title, contents):
        for h, kws in rules:
            if any(k in src for k in kws):
                return h
    return "물체에 맞음"


def _keyword_in_text(kw, text_lower, text_compact):
    kw_lower = kw.lower()
    if kw_lower in text_lower:
        return True
    kw_compact = kw_lower.replace(" ", "")
    if len(kw_compact) >= 3 and kw_compact in text_compact:
        return True
    return False


def classify_work_type(industry, title, contents, hazard_type):
    """
    Classifies work_type using title-weighted (2.5x) domain keyword scoring,
    falling back to a hazard-type-aware classifier when no domain keyword matches.
    """
    rules = WORK_TYPE_DOMAIN_RULES.get(industry, [])
    t_low = (title or "").lower()
    t_comp = t_low.replace(" ", "")
    b_low = (contents or "").lower()
    b_comp = b_low.replace(" ", "")

    best_wt = None
    best_score = 0.0

    for wt, kw_list in rules:
        score = 0.0
        for kw, base_weight in kw_list:
            if _keyword_in_text(kw, t_low, t_comp):
                score += base_weight * TITLE_SCORE_WEIGHT
            if _keyword_in_text(kw, b_low, b_comp):
                score += base_weight * BODY_SCORE_WEIGHT
        if score > best_score:
            best_score = score
            best_wt = wt

    if best_wt and best_score > 0:
        return best_wt

    fallback_map = HAZARD_WORK_TYPE_FALLBACK.get(industry, {})
    if hazard_type in fallback_map:
        return fallback_map[hazard_type]

    return rules[0][0]


def _clean_candidate_noun(phrase):
    p = clean_text(phrase)
    p = re.sub(r"\([^)]*\)", "", p)
    p = re.sub(r"\d+\s*명[이가]?\s*", "", p)
    p = re.sub(r"^.*?(?:작업\s*중|이동\s*중|운반\s*중|점검\s*중|보수\s*중|수리\s*중|해체\s*중|설치\s*중)\s+", "", p)
    p = re.sub(r"^.*?(?:에서|내에서|현장에서|공장에서|창고에서)\s+", "", p)
    p = LEADING_MODIFIER_RE.sub("", p).strip()
    p = re.sub(r"(?:의|을|를|이|가|은|는|에|에서|으로|로|와|과)$", "", p).strip()

    raw_tokens = [tok for tok in p.split() if len(tok) >= 2 and tok not in NON_EQUIP_STOPWORDS]
    tokens = [
        tok for tok in raw_tokens
        if not re.search(r"(?:하다|하던|하며|되어|되면서|못하고|중이던|있던|발생|사망|무너짐|떨어짐|추락|연쇄적)$", tok)
    ]
    if not tokens:
        return ""
    candidate = " ".join(tokens[-2:]) if len(tokens) > 2 else " ".join(tokens)
    if len(candidate) < 2 or len(candidate) > 16:
        return ""
    if candidate in NON_EQUIP_STOPWORDS:
        return ""
    return EQUIP_ALIASES.get(candidate.replace(" ", ""), candidate)


def extract_equipment_noun_phrase(title, contents):
    """
    Extracts an equipment/object Korean noun phrase from accident title
    (or equipment-suffixed noun from contents) when no dictionary item matches.
    """
    title_patterns = [
        r"([가-힣A-Za-z0-9·\-]+(?:\s+[가-힣A-Za-z0-9·\-]+){0,1}?)(?:에\s*(?:끼임|맞음|깔림|부딪힘|감전|말림|치임)|와\s*충돌|과\s*충돌)",
        r"([가-힣A-Za-z0-9·\-]+(?:\s+[가-힣A-Za-z0-9·\-]+){0,1}?)(?:에서|위에서|상부에서|상단에서)\s*(?:떨어짐|추락|빠짐|미끄러짐)",
        r"^([가-힣A-Za-z0-9·\-]+(?:\s+[가-힣A-Za-z0-9·\-]+){0,1}?)\s+(?:설치|해체|교체|보수|수리|점검|운반|인양|절단|천공|가공|세척|도장|투입|개방|포설|시공|철거|상차|하차|하역|조재)\s*작업",
        r"^([가-힣A-Za-z0-9·\-]+(?:\s+[가-힣A-Za-z0-9·\-]+){0,1}?)\s*(?:전도|전복|붕괴|폭발|파단|파손|누출)",
    ]

    for pat in title_patterns:
        for m in re.finditer(pat, title or ""):
            cand = _clean_candidate_noun(m.group(1))
            if cand:
                return cand

    for src in (title, contents):
        for m in EQUIP_SUFFIX_RE.finditer(src or ""):
            cand = _clean_candidate_noun(m.group(1))
            if cand:
                return cand

    return ""


def extract_equipment(title, contents, work_type):
    """
    1) Prioritizes dictionary equipment match in `title` first, then `contents`.
    2) Falls back to Korean noun-phrase extraction on `title` / equipment-suffix match.
    3) Uses clean work-type equipment label instead of raw work_type prefix.
    """
    title_compact = (title or "").replace(" ", "")
    for equip in EQUIP_LIST:
        key = equip.replace(" ", "")
        if key in title_compact:
            return EQUIP_ALIASES.get(key, equip)

    contents_compact = (contents or "").replace(" ", "")
    for equip in EQUIP_LIST:
        key = equip.replace(" ", "")
        if key in contents_compact:
            return EQUIP_ALIASES.get(key, equip)

    extracted = extract_equipment_noun_phrase(title, contents)
    if extracted:
        return extracted

    return WORK_TYPE_DEFAULT_EQUIP.get(work_type, "현장 작업 설비 및 기구")


def select_template_key(hazard_type, full_text):
    if hazard_type == "끼임":
        if any(k in full_text for k in ["지게차", "고소작업", "아웃트리거", "리프트", "엘리베이터", "승강기", "청소차", "수집차", "트레일러", "크레인", "대차", "차량", "스키드로더"]):
            return "끼임_장비"
        return "끼임_설비"
    if hazard_type == "물체에 맞음":
        if any(k in full_text for k in ["굴착", "토사", "되메우기", "흙막이", "사면"]):
            return "맞음_굴착토사"
        if any(k in full_text for k in ["크레인", "슬링", "와이어로프", "윈치", "인양", "달기구", "호이스트", "훅"]):
            return "맞음_인양달기구"
        return "맞음_낙하비래"
    return hazard_type if hazard_type in TEMPLATES else "맞음_낙하비래"


def register_template(t_key, templates_out, tpl_key_to_id):
    if t_key not in tpl_key_to_id:
        tpl = TEMPLATES[t_key]
        t_id = f"T{len(templates_out) + 1:02d}"
        tpl_key_to_id[t_key] = t_id
        templates_out[t_id] = {
            "preventive_measures": tpl["measures"],
            "tbm_checklist": tpl["tbm"],
            "ox_comparison": tpl["ox"],
            "worker_slogan": tpl["slogan"],
            "legal_ref": tpl["legal"],
            "related_work_types": tpl["related"],
            "root_causes": [
                "작업 전 관리감독자의 현장 안전상태 사전 점검 누락",
                "동종·유사 공정 위험성평가 및 5분 TBM 교육 미실시",
            ],
        }
    return tpl_key_to_id[t_key]


def build_keywords(industry, hazard_type, equipment, work_type):
    ordered = []
    for tok in (industry, hazard_type, equipment, work_type.split("·")[0]):
        if tok and tok not in ordered:
            ordered.append(tok)
    return ordered


def fetch_kosha_cases(service_key, business="", limit=500, rows=100):
    import requests

    collected, page = [], 1
    while len(collected) < limit:
        params = {
            "serviceKey": service_key,
            "callApiId": "1060",
            "pageNo": page,
            "numOfRows": min(rows, limit - len(collected)),
        }
        if business:
            params["business"] = business

        data = None
        for url in URLS:
            try:
                res = requests.get(url, params=params, timeout=25)
                res.raise_for_status()
                data = res.json()
                break
            except Exception as e:
                print(f"[{business}] 재시도({url[:5]}): {e}")

        if not data or str(data.get("header", {}).get("resultCode", "")) != "00":
            break

        body = data.get("body", {}) or {}
        items_wrap = body.get("items") or {}
        items = items_wrap.get("item", []) if isinstance(items_wrap, dict) else []
        if isinstance(items, dict):
            items = [items]
        if not items:
            break

        collected.extend(items)
        total_count = int(body.get("totalCount", 0) or 0)
        print(f"[{business}] {page}p 완료 — 누적 {len(collected)}/{min(limit, total_count)}건")
        if len(collected) >= total_count or len(items) < min(rows, limit - (len(collected) - len(items))):
            break
        page += 1
        time.sleep(0.15)
    return collected


def reclassify_local_db(db_path):
    if not os.path.exists(db_path):
        print(f"ERROR: 로컬 DB 파일을 찾을 수 없습니다: {db_path}")
        sys.exit(1)

    with open(db_path, "r", encoding="utf-8") as f:
        existing = json.load(f)

    raw_cases = existing.get("cases", [])
    if not raw_cases:
        print("ERROR: 로컬 DB에 재분류할 사고사례가 없습니다.")
        sys.exit(1)

    templates_out, tpl_key_to_id, updated_cases = {}, {}, []
    industry_to_biz = {"건설현장": "건설업", "제조업": "제조업", "서비스업": "서비스업"}

    for case in raw_cases:
        title = clean_text(str(case.get("title", "")))
        summary_lines = case.get("summary_3lines") or []
        contents = clean_text(" ".join(str(x) for x in summary_lines if x))
        full_text = f"{title} {contents}"

        industry = case.get("industry", "건설현장")
        if industry not in WORK_TYPE_DOMAIN_RULES:
            industry = "건설현장"

        raw_process = str(case.get("process", ""))
        raw_biz = raw_process.split(" · ")[0].strip() if " · " in raw_process else industry_to_biz[industry]

        hazard_type = detect_hazard(title, contents)
        work_type = classify_work_type(industry, title, contents, hazard_type)
        equipment = extract_equipment(title, contents, work_type)
        t_key = select_template_key(hazard_type, full_text)
        t_id = register_template(t_key, templates_out, tpl_key_to_id)

        updated_cases.append({
            "id": case["id"],
            "industry": industry,
            "process": f"{raw_biz} · {work_type}",
            "work_type": work_type,
            "equipment": equipment,
            "hazard_type": hazard_type,
            "season_tag": case.get("season_tag", "상시"),
            "severity": case.get("severity", "중대재해"),
            "title": title,
            "source_ref": case.get("source_ref", ""),
            "summary_3lines": summary_lines,
            "direct_causes": [
                f"{equipment} 작업 시 핵심 {hazard_type} 방호조치 미흡",
                "작업 전 위험요인 확인 및 안전작업절차 미준수",
                "위험구역 출입 통제 또는 전용 보호구 착용 미흡",
            ],
            "keywords": build_keywords(industry, hazard_type, equipment, work_type),
            "t": t_id,
        })

    payload = {
        "format": "kosha-lite-v1",
        "updated_at": existing.get("updated_at") or time.strftime("%Y-%m-%d"),
        "templates": templates_out,
        "cases": updated_cases,
    }
    with open(db_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = os.path.getsize(db_path) / 1024
    print(f"[로컬 재분류 완료] {len(updated_cases)}건 ({size_kb:.1f} KB) -> {os.path.abspath(db_path)}")
    print("업종별 분포:", dict(Counter(x["industry"] for x in updated_cases)))
    for ind in ("건설현장", "제조업", "서비스업"):
        dist = Counter(x["work_type"] for x in updated_cases if x["industry"] == ind)
        print(f"  - {ind} 작업유형 분포:", dict(dist))


def fetch_and_build_db(db_path):
    raw_key = os.environ.get("KOSHA_API_KEY", "").strip()
    if not raw_key:
        print("ERROR: KOSHA_API_KEY 시크릿이 설정되지 않았습니다.")
        sys.exit(1)

    service_key = unquote(raw_key)
    all_raw, seen = [], set()
    for biz in TARGET_BUSINESSES:
        for it in fetch_kosha_cases(service_key, biz, PER_BUSINESS_LIMIT, NUM_OF_ROWS):
            bno = str(it.get("boardno", "")).strip()
            if bno and bno not in seen:
                seen.add(bno)
                all_raw.append(it)

    templates_out, tpl_key_to_id, lite_cases = {}, {}, []

    for idx, item in enumerate(all_raw, 1):
        title = clean_text(str(item.get("keyword", "")))
        contents = clean_text(str(item.get("contents", "")))
        if any(k in title or k in contents for k in EXCLUDE_KEYWORDS):
            continue
        if len(contents) < 25 or contents == title:
            continue

        boardno = str(item.get("boardno", f"KOSHA{idx:04d}")).strip()
        raw_biz = str(item.get("business", "")).strip()
        full_text = f"{title} {contents}"
        industry = "건설현장" if "건설" in raw_biz else "제조업" if "제조" in raw_biz else "서비스업"
        hazard_type = detect_hazard(title, contents)
        work_type = classify_work_type(industry, title, contents, hazard_type)
        equipment = extract_equipment(title, contents, work_type)
        t_key = select_template_key(hazard_type, full_text)
        t_id = register_template(t_key, templates_out, tpl_key_to_id)

        prefix = {"건설현장": "CON", "제조업": "MFG", "서비스업": "SVC"}[industry]

        lite_cases.append({
            "id": f"{prefix}-KOSHA-{boardno[-8:]}",
            "industry": industry,
            "process": f"{raw_biz} · {work_type}",
            "work_type": work_type,
            "equipment": equipment,
            "hazard_type": hazard_type,
            "season_tag": "동절기" if any(k in contents for k in ["갈탄", "양생", "결빙", "폭설", "제설"])
                          else "장마철" if any(k in contents for k in ["우천", "장마", "강풍", "폭우"])
                          else "혹서기" if any(k in contents for k in ["폭염", "온열", "열사병"])
                          else "상시",
            "severity": "사망" if any(k in contents for k in ["사망", "숨"]) else "중대재해",
            "title": title,
            "source_ref": f"안전보건공단 국내재해사례 오픈API ({boardno})",
            "summary_3lines": split_3lines(title, contents),
            "direct_causes": [
                f"{equipment} 작업 시 핵심 {hazard_type} 방호조치 미흡",
                "작업 전 위험요인 확인 및 안전작업절차 미준수",
                "위험구역 출입 통제 또는 전용 보호구 착용 미흡",
            ],
            "keywords": build_keywords(industry, hazard_type, equipment, work_type),
            "t": t_id,
        })

    if not lite_cases:
        print("ERROR: 유효 사례가 0건입니다.")
        sys.exit(1)

    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    payload = {
        "format": "kosha-lite-v1",
        "updated_at": time.strftime("%Y-%m-%d"),
        "templates": templates_out,
        "cases": lite_cases,
    }
    with open(db_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = os.path.getsize(db_path) / 1024
    print(f"저장 완료: {len(lite_cases)}건 ({size_kb:.1f} KB) -> {os.path.abspath(db_path)}")
    print("업종별 분포:", dict(Counter(x["industry"] for x in lite_cases)))


def main():
    parser = argparse.ArgumentParser(description="KOSHA 국내재해사례 Lite DB 수집 및 도메인 재분류 스크립트")
    parser.add_argument(
        "--reclassify-local",
        action="store_true",
        help="API 호출 없이 로컬 public/data/accidents_db_lite.json을 최신 분류기·기인물 추출기로 재분류합니다.",
    )
    parser.add_argument(
        "--db-path",
        default=OUTPUT_PATH,
        help=f"입출력 Lite DB 경로 (기본값: {OUTPUT_PATH})",
    )
    args = parser.parse_args()

    if args.reclassify_local:
        reclassify_local_db(args.db_path)
    else:
        fetch_and_build_db(args.db_path)


if __name__ == "__main__":
    main()
