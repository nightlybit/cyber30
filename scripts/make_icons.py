"""Draw the app icon as PNG with only the Python standard library."""
import math, struct, zlib, sys, os
def seg_d(px, py, ax, ay, bx, by):
    dx, dy = bx-ax, by-ay; t = max(0, min(1, ((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy)))
    return math.hypot(px-ax-t*dx, py-ay-t*dy)
def curve(p0, c, p1, n=8):
    return [((1-t)**2*p0[0]+2*(1-t)*t*c[0]+t*t*p1[0], (1-t)**2*p0[1]+2*(1-t)*t*c[1]+t*t*p1[1]) for t in [i/n for i in range(1, n+1)]]
shield = [(32,9),(51,16),(51,31)] + curve((51,31),(51,48),(32,55)) + curve((32,55),(13,48),(13,31)) + [(13,16),(32,9)]
check = [(24,33),(30,39),(41,26)]
def color(x, y):  # x,y in 0..64 space
    t = (x+y)/128
    g = (int(0x3d+(0x4c-0x3d)*t), int(0xdc+(0xc9-0xdc)*t), int(0x97+(0xf0-0x97)*t))
    d1 = min(seg_d(x,y,*shield[i],*shield[i+1]) for i in range(len(shield)-1))
    d2 = min(seg_d(x,y,*check[i],*check[i+1]) for i in range(len(check)-1))
    a = max(min(1, max(0, 2.6-d1)), min(1, max(0, 2.9-d2)))
    bg = (0x0b,0x10,0x20)
    return tuple(int(bg[i]*(1-a)+g[i]*a) for i in range(3))
def png(size, path):
    rows = []
    for py in range(size):
        row = bytearray([0])
        for px in range(size):
            row += bytes(color((px+.5)*64/size, (py+.5)*64/size)) + b"\xff"
        rows.append(bytes(row))
    raw = zlib.compress(b"".join(rows), 9)
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t+d) & 0xffffffff)
    open(path, "wb").write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)) + chunk(b"IDAT", raw) + chunk(b"IEND", b""))
out = sys.argv[1]
for s in (192, 512): png(s, os.path.join(out, f"icon-{s}.png"))
