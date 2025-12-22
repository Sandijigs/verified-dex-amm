import { Shield, Github, FileText, Activity } from 'lucide-react'
import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-6 h-6 text-primary" />
              <span className="font-bold">Verified DEX</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Secure AMM on Stacks with verified pool templates and Clarity 4 features.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/yourusername/verified-dex-amm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="/docs"
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:3001/health"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2"
                >
                  <Activity className="w-4 h-4" />
                  Chainhooks Status
                </a>
              </li>
            </ul>
          </div>

          {/* Network Info */}
          <div>
            <h3 className="font-semibold mb-4">Network</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Network: Stacks Testnet</p>
              <p className="font-mono text-xs truncate">
                Deployer: ST12KRGRZ2N2Q5B8HKXHETGRD0JVF282TAAXNM1ZV
              </p>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>All Systems Operational</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>Built for the Talent Protocol Builder Challenge</p>
          <p className="mt-1">© 2025 Verified DEX. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}