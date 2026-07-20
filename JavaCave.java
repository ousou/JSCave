/*
 * Decompiled with CFR 0_123.
 */
import java.applet.Applet;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.Event;
import java.awt.Font;
import java.awt.Frame;
import java.awt.Graphics;
import java.awt.Image;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;
import java.awt.image.ImageObserver;

public class JavaCave
extends Applet
implements Runnable {
    static final int SizeX = 128;
    static final int SizeY = 160;
    static final int SLeft = 0;
    static final int STop = 0;
    static final int TimeOut = 100;
    static final int GS_TITLE = 0;
    static final int GS_GAME = 1;
    static final int GS_OVER = 2;
    static final int GC_FIRST = 1;
    Thread m_JavaCave;
    Image OffScreen;
    Graphics Canvas;
    Dimension OffScreenSize;
    int mouseX;
    int mouseY;
    boolean mousePushed;
    boolean mouseClicked;
    boolean keyPushed;
    int GameState;
    int GameCount;
    boolean flag1;
    int HiScore;
    int Score;
    int[][] map = new int[4][32];
    int my;
    int mh;
    int mv;
    int oy;
    int y;
    int vy;
    
    public static void main(String[] args) {
        Frame ComApplet = new Frame("JavaCave");
        Applet commandLineApplet = new JavaCave();
        ComApplet.add(commandLineApplet);
        ComApplet.addWindowListener(new WindowAdapter() {
            public void windowClosing(WindowEvent e) {
                System.exit(0);
            }
        });
        commandLineApplet.resize(128, 160);
        ComApplet.pack();
        ComApplet.setVisible(true);

        commandLineApplet.init();
        commandLineApplet.start();
    }

    @Override
    public Dimension getPreferredSize() {
        return new Dimension(SizeX, SizeY);
    }
    
    public void start() {
        if (this.m_JavaCave == null) {
            this.m_JavaCave = new Thread(this);
            this.m_JavaCave.start();
        }
        this.MainStart();
    }

    void MainStart() {
        this.setGameState(0);
    }

    public void stop() {
        if (this.m_JavaCave != null) {
            this.m_JavaCave.stop();
            this.m_JavaCave = null;
        }
    }

    public boolean keyUp(Event event, int n) {
        if (n == 32) {
            this.keyPushed = false;
        }
        return true;
    }

    public boolean mouseMove(Event event, int n, int n2) {
        this.mouseX = n;
        this.mouseY = n2;
        return true;
    }

    void setGameState(int n) {
        this.GameState = n;
        this.GameCount = 0;
    }

    public boolean mouseDown(Event event, int n, int n2) {
        this.mouseX = n;
        this.mouseY = n2;
        this.mousePushed = true;
        this.mouseClicked = true;
        return true;
    }

    public boolean keyDown(Event event, int n) {
        if (n == 32) {
            this.keyPushed = true;
        }
        return true;
    }

    public String getAppletInfo() {
        return "\u540d\u524d: JavaCave\r\n" + "\u8457\u4f5c\u8005: SUNFLAT/Y.Iwasaki\n" + "E-Mail: sunflat@ppp.bekkoame.or.jp\n" + "URL   :\thttp://www.bekkoame.or.jp/~sunflat/\n" + "Microsoft Visual J++ Version 1.0 \u3067\u4f5c\u6210\u3055\u308c\u307e\u3057\u305f";
    }

    public boolean mouseUp(Event event, int n, int n2) {
        this.mouseX = n;
        this.mouseY = n2;
        this.mousePushed = false;
        return true;
    }

    public void run() {
        do {
            try {
                Thread.sleep(100);
                this.repaint();
                continue;
            }
            catch (InterruptedException interruptedException) {
                this.stop();
                continue;
            }
        } while (true);
    }

    private void OnPeriod() {
        ++this.GameCount;
        switch (this.GameState) {
            default: {
                break;
            }
            case 0: {
                if (this.GameCount == 1) {
                    this.flag1 = false;
                    if (this.HiScore < this.Score) {
                        this.HiScore = this.Score;
                    }
                }
                this.Canvas.setColor(new Color(128, 128, 255));
                this.Canvas.fillRect(0, 0, 128, 160);
                this.Canvas.setColor(new Color(0, (int)(Math.random() * 64.0), 128));
                int n = (int)((Math.sin((double)this.GameCount / 10.0) + 1.0) * 20.0) + 20;
                this.Canvas.fillOval(64 - n, 64 - n, n * 2, n * 2);
                this.Canvas.setFont(new Font("TimesRoman", 1, 32));
                this.Canvas.setColor(new Color(0, 0, 0));
                this.Canvas.drawString("SFCave", 15, 50);
                this.Canvas.setColor(new Color(255, 255, 255));
                this.Canvas.drawString("SFCave", 10, 45);
                this.Canvas.setFont(new Font("TimesRoman", 1, 16));
                this.Canvas.setColor(new Color(255, 0, 0));
                this.Canvas.drawString("Click to start!", 10, 80);
                this.Canvas.setColor(new Color(255, 255, 255));
                this.Canvas.drawString("Score   : " + this.Score, 10, 110);
                this.Canvas.drawString("HiScore : " + this.HiScore, 10, 130);
                if (!this.flag1 && !this.mousePushed) {
                    this.flag1 = true;
                    this.mouseClicked = false;
                }
                if (!this.flag1 || !this.mouseClicked) break;
                this.setGameState(1);
                break;
            }
            case 1: {
                int n;
                int n2;
                if (this.GameCount == 1) {
                    this.Score = 0;
                    this.my = 10;
                    this.mh = 108;
                    this.mv = 0;
                    this.oy = 50;
                    this.y = 50;
                    this.vy = -5;
                    n2 = 0;
                    do {
                        n = Math.abs(n2 % 16 - 8) * 16;
                        this.Canvas.setColor(new Color(128 - n, 255, 128 - n));
                        this.Canvas.fillRect(n2 * 4, 0, 4, 128);
                        this.Canvas.setColor(new Color(n, 0, 0));
                        this.Canvas.fillRect(n2 * 4, this.my, 4, this.mh);
                        this.map[0][n2] = this.my;
                        this.map[1][n2] = this.my + this.mh;
                        this.map[2][n2] = -1;
                    } while (++n2 < 32);
                    this.Canvas.setFont(new Font("TimesRoman", 1, 16));
                }
                this.Score += 3;
                this.vy = this.mousePushed || this.keyPushed ? --this.vy : ++this.vy;
                if (this.vy < -8) {
                    this.vy = -8;
                } else if (this.vy > 8) {
                    this.vy = 8;
                }
                this.y += this.vy;
                if (this.GameCount % 10 == 0) {
                    --this.mh;
                }
                if (Math.random() < 0.1) {
                    this.mv = (int)(Math.random() * 10.0 - 5.0);
                }
                this.my += this.mv;
                if (this.my < 1) {
                    this.my = 1;
                    this.mv = Math.abs(this.mv);
                }
                if (this.my > 126 - this.mh) {
                    this.my = 126 - this.mh;
                    this.mv = - Math.abs(this.mv);
                }
                this.Canvas.setColor(new Color(128, 128, 255));
                this.Canvas.fillRect(0, 128, 128, 32);
                this.Canvas.setColor(new Color(255, 255, 255));
                this.Canvas.drawString("Score : " + this.Score, 20, 150);
                this.Canvas.copyArea(2, 0, 126, 128, -4, 0);
                n2 = 0;
                do {
                    int n3 = 0;
                    do {
                        this.map[n3][n2] = this.map[n3][n2 + 1];
                    } while (++n3 < 4);
                } while (++n2 < 31);
                this.Canvas.setColor(new Color(128, 128, 255));
                this.Canvas.drawLine(30, this.oy - 1, 34, this.y - 1);
                this.Canvas.drawLine(30, this.oy, 34, this.y);
                this.Canvas.drawLine(30, this.oy + 1, 34, this.y + 1);
                n = Math.abs(this.GameCount % 16 - 8) * 16;
                this.Canvas.setColor(new Color(128 - n, 255, 128 - n));
                this.Canvas.fillRect(124, 0, 4, 128);
                this.Canvas.setColor(new Color(n, 0, 0));
                this.Canvas.fillRect(124, this.my, 4, this.mh);
                this.map[0][31] = this.my;
                this.map[1][31] = this.my + this.mh;
                if (this.GameCount % 10 == 0) {
                    n = (int)(Math.random() * (double)(this.mh - 16) + (double)this.my);
                    this.Canvas.setColor(new Color(0, 255, 128));
                    this.Canvas.fillRect(124, n, 4, 16);
                    this.map[2][31] = n;
                } else {
                    this.map[2][31] = -1;
                }
                this.oy = this.y;
                if (this.y >= this.map[0][8] && this.map[1][8] >= this.y && (this.map[2][8] == -1 || this.map[2][8] >= this.y || this.y >= this.map[2][8] + 16)) break;
                this.setGameState(2);
                break;
            }
            case 2: {
                if (this.GameCount == 1) {
                    this.flag1 = false;
                }
                if (this.GameCount < 20) {
                    this.Canvas.setColor(new Color(255, 0, 0));
                    int n = this.GameCount * 2;
                    this.Canvas.drawOval(32 - n, this.y - n, n * 2, n * 2);
                }
                if (this.GameCount == 20) {
                    this.Canvas.setFont(new Font("TimesRoman", 1, 24));
                    this.Canvas.setColor(new Color(0, 0, 255));
                    this.Canvas.drawString("GameOver", 7, 50);
                    if (this.HiScore < this.Score) {
                        this.Canvas.setColor(new Color(255, 128, 0));
                        this.Canvas.drawString("HiScore!!", 13, 100);
                    }
                }
                if (this.GameCount == 100) {
                    this.flag1 = true;
                    this.mouseClicked = true;
                }
                if (this.GameCount <= 20) break;
                if (!this.flag1 && !this.mousePushed) {
                    this.flag1 = true;
                    this.mouseClicked = false;
                }
                if (!this.flag1 || !this.mouseClicked) break;
                this.setGameState(0);
                break;
            }
        }
    }

    public void destroy() {
    }

    public void init() {
        this.resize(128, 160);
        this.OffScreen = this.createImage(128, 160);
        this.Canvas = this.OffScreen.getGraphics();
    }

    public void update(Graphics graphics) {
        this.OnPeriod();
        graphics.drawImage(this.OffScreen, 0, 0, this);
    }
}
