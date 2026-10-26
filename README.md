# 신촌 모험

신촌역·현대백화점·U-PLEX·연세로·연세대 주변을 걷는 3D 픽셀 산책 게임입니다.

사이트 루트는 `prototype/`으로 연결됩니다. 기존 2D 게임과 실행용 백업은 제거했으며 Git 이력에서 복구할 수 있습니다.

- 실행: 저장소에서 `python3 -m http.server 8000` 후 `http://localhost:8000/` 접속
- 테스트: `node tests/prototype.test.mjs`, `python3 tests/geography.test.py`
- 구현·조작 설명: [prototype/README.md](prototype/README.md)
- 지리 원본·조사 기록: `reference/`, 지도 생성 도구: `scripts/`

실내와 지하 구간은 아직 열리지 않았습니다. 지하 조사 자료는 향후 구현용으로 보존합니다.
