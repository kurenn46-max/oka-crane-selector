# 岡重機 Crane Selector — 性能表精査記録

精査日: 2026-09-26

## 共通ルール
- ブーム定格総荷重は、メーカー資料に従いフック・つり具質量を含む値として扱う。
- 入力半径が表にない場合は補間せず、次の大きい作業半径を使用する。
- 現在の選定は「最大アウトリガー張出・全周/360°」のみ。
- 最終判断は実機の型式・仕様・AML表示・メーカー性能表で再確認する。

## 登録機種

| クラス | 機種 | 現在の表条件 | 主な確認事項 |
|---|---|---|---|
| 12t | TADANO GR-120NL-2 | 最大4.7m・全周 | 12tフック90kg。GR-120N-2（4.9t仕様）と区別 |
| 13t | KATO MR-130 (KRM-13H) | 最大4.75m・全周 | 13tフック90kg。16.52mブームの末端半径を修正 |
| 16t | TADANO GR-160N-3 | 最大5.2m・全周 | 主巻フック140kg |
| 20t | KATO SR-200R | 最大5.4m・全周 | 20tフック200kg |
| 25t | KATO SR-250R | 最大6.6m・360° | 25tフック220kg |
| 50t | TADANO GR-500N-1 | 最大7.4m・全周 | 全ブーム列を再照合 |
| 60t | TADANO GR-600N-3 | 最大7.6m・360°標準性能 | SMART CHARTと標準360°を分離。全8ブーム列を再照合 |
| 70t | TADANO GR-700N-1 | 最大7.6m・全周標準性能 | 9.8mは35tフック×2、16.6m以降は35tフック340kg |
| 100t | TADANO GR-1000N-1 | CW4.0t・最大7.8m・360°標準性能 | 全12ブーム列。50tフック430kgを基本、安全側設定 |

## 主な修正
1. GR-600N-3: 17.8mブーム・半径10mの標準360°性能は14.90t。14.50tは14.1mブームの値。SMART CHARTとの混同を修正。
2. GR-700N-1: 16.6mブーム列を追加し、フック条件を修正。
3. GR-500N-1: 16.0mブームの有効半径を公式表に合わせて修正。
4. GR-1000N-1: 12種類のブーム列を登録し、CW4.0t・7.8m・360°の標準性能に固定。
5. GR-120NL-2: 12t仕様と4.9t仕様を混同しないよう型式を明示。
6. MR-130: 16.52mブームの最大半径以降に別ブーム列の値が混ざっていたため修正。

## 参照資料
- TADANO GR-160N-3: https://www.tadano.co.jp/products/upload/docs/GR-160N-3-201_202.pdf
- KATO MR-130: https://www.kato-works.co.jp/products/roughter/pdf/MR/MR-130_spec.pdf
- KATO SR-200R: https://www.kato-works.co.jp/products/roughter/pdf/SR/SR200R_spec.pdf
- KATO SR-250R: https://www.kato-works.co.jp/eng/products/roughter/pdf/C03351_SR-250R.pdf
- TADANO GR-1000N-1: https://www.tadano.co.jp/products/upload/docs/GR-1000N-1_spec_20190919-2.pdf
- GR-120NL-2 archived specification copy: https://scp.global-bim.com/Content/download/rough_terrain/GR-120NL_N-2_02.pdf

## 注意
このアプリは選定補助。ブーム干渉、高さ、地耐力、風、吊具角度、ジブ、シングルトップ、アウトリガー中間張出、前方/側方/後方域などは別途確認が必要。
