# -*- coding: utf-8 -*-
"""把三份 CSV 编译成站点直接可用的 assets/data.js。

输入（默认从 Hermes 附件目录读取，可用 --src 覆盖）：
  李白.csv        诗题, 诗句, 诗ID, 句内序号
  杜甫.csv        同上
  李白-杜甫.csv   李白, 题, 句, 杜甫, 题, 句, 相似度*10000, 李诗ID, 李句序, 杜诗ID, 杜句序

输出：
  assets/data.js   window.LD = {...}  （用 <script> 加载，file:// 双击也能跑）
"""
import argparse
import collections
import csv
import json
import math
import os
import re

PUNCT = set("，。、；：？！“”‘’（）《》〈〉·—…　 ,.;:?!\"'()[]")
LI, DU = 0, 1


def load(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return [r for r in csv.reader(f) if r]


def main():
    ap = argparse.ArgumentParser()
    here = os.path.dirname(os.path.abspath(__file__))
    ap.add_argument("--src", default=os.path.join(here, "data"))
    ap.add_argument("--out", default=os.path.join(here, "assets", "data.js"))
    args = ap.parse_args()

    lb = load(os.path.join(args.src, "李白.csv"))
    df = load(os.path.join(args.src, "杜甫.csv"))
    mt = load(os.path.join(args.src, "李白-杜甫.csv"))

    poems = {}          # pid -> [title, poet, [lines...]]
    char_count = {LI: collections.Counter(), DU: collections.Counter()}

    for poet, rows in ((LI, lb), (DU, df)):
        grouped = collections.defaultdict(list)
        for title, line, pid, idx in rows:
            grouped[(int(pid), title)].append((int(idx), line))
        for (pid, title), items in grouped.items():
            items.sort()
            # 句序可能有重复/跳号，按出现顺序保留
            lines = [t for _, t in items]
            poems[pid] = [title, poet, lines]
            for t in lines:
                for ch in t:
                    if ch not in PUNCT:
                        char_count[poet][ch] += 1

    # ---- 句对 ----
    pairs = []
    seen = set()
    for r in mt:
        if len(r) < 11:
            continue
        try:
            sim = int(r[6]); lp = int(r[7]); li = int(r[8]); dp = int(r[9]); di = int(r[10])
        except ValueError:
            continue
        key = (sim, lp, li, dp, di)
        if key in seen:
            continue
        seen.add(key)
        # 校验索引落在诗句范围内，丢掉坏行
        if lp not in poems or dp not in poems:
            continue
        if li >= len(poems[lp][2]) or di >= len(poems[dp][2]):
            continue
        pairs.append([sim, lp, li, dp, di])
    pairs.sort(key=lambda p: -p[0])

    # 同一对各句可能因《全唐诗》重复收录（如《蜀道难》与《相和歌辞 蜀道难》）出现两次，
    # 句面完全相同则合并，只保留第一条。
    raw = len(pairs)
    uniq, seen_text = [], set()
    for p in pairs:
        key = (p[0], poems[p[1]][2][p[2]], poems[p[3]][2][p[4]])
        if key in seen_text:
            continue
        seen_text.add(key)
        uniq.append(p)
    dup_rows = raw - len(uniq)
    pairs = uniq

    # ---- 相似度直方图（0.70–1.00，0.01 一格）----
    hist = [0] * 31
    for sim, *_ in pairs:
        hist[max(0, min(30, round(sim / 10000.0 * 100) - 70))] += 1

    # ---- 用字倾向 ----
    def rate(counter, total):
        return {ch: n / total * 10000 for ch, n in counter.items()}
    n_lb = sum(char_count[LI].values())
    n_du = sum(char_count[DU].values())
    r_lb, r_du = rate(char_count[LI], n_lb), rate(char_count[DU], n_du)
    scored = []
    for ch in set(r_lb) | set(r_du):
        if char_count[LI][ch] < 15 or char_count[DU][ch] < 15:
            continue   # 两边都够量，避免"某字只出现 3 次"这种假信号
        a, b = r_lb[ch], r_du[ch]
        scored.append((math.log(a / b), ch, round(a, 1), round(b, 1),
                       char_count[LI][ch], char_count[DU][ch]))
    scored.sort()
    chars = {
        "du": [[ch, a, b, ca, cb] for _, ch, a, b, ca, cb in scored[:9]][::-1],
        "li": [[ch, a, b, ca, cb] for _, ch, a, b, ca, cb in scored[-9:]],
    }

    # ---- 互寄诗：杜甫怀李白 7 首、李白寄杜甫 3 首 ----
    du_to_li = sorted({int(pid) for pid, v in poems.items()
                       if v[1] == DU and "李白" in v[0]})
    li_to_du = sorted({int(pid) for pid, v in poems.items()
                       if v[1] == LI and re.search("杜甫|杜二甫", v[0])})

    data = {
        "meta": {
            "pairs": len(pairs),
            "pairsRaw": raw,
            "dupRows": dup_rows,
            "poems": len(poems),
            "lbPoems": sum(1 for v in poems.values() if v[1] == LI),
            "duPoems": sum(1 for v in poems.values() if v[1] == DU),
            "lbLines": sum(len(v[2]) for v in poems.values() if v[1] == LI),
            "duLines": sum(len(v[2]) for v in poems.values() if v[1] == DU),
            "lbMatchedPoems": len({p[1] for p in pairs}),
            "duMatchedPoems": len({p[3] for p in pairs}),
            "lbMatchedLines": len({(p[1], p[2]) for p in pairs}),
            "duMatchedLines": len({(p[3], p[4]) for p in pairs}),
            "minSim": min(p[0] for p in pairs),
            "maxSim": max(p[0] for p in pairs),
            "lbChars": n_lb,
            "duChars": n_du,
        },
        "hist": hist,
        "chars": chars,
        "memorial": {"du": du_to_li, "li": li_to_du},
        "poems": {str(k): v for k, v in sorted(poems.items())},
        "pairs": pairs,
    }

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    body = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    with open(args.out, "w", encoding="utf-8") as f:
        f.write("window.LD=")
        f.write(body)
        f.write(";\n")

    print(json.dumps(data["meta"], ensure_ascii=False, indent=2))
    print("hist", hist)
    print("size %.1f MB" % (len(body.encode("utf-8")) / 1048576))
    print("chars li", chars["li"])
    print("chars du", chars["du"])


if __name__ == "__main__":
    main()
