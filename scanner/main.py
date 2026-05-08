#!/usr/bin/env python3
"""
WordPress Security Scanner
Author: Sherjeel Khan
"""

import requests
import json
import sys
import argparse
from datetime import datetime

class WordPressScanner:
    def __init__(self, target_url):
        self.target_url = target_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'WordPress-Security-Scanner/1.0'
        })
        self.results = {
            'url': target_url,
            'scan_date': datetime.now().isoformat(),
            'is_wordpress': False,
            'findings': [],
            'security_score': 100
        }
    
    def check_wordpress(self):
        """Check if site is WordPress"""
        paths = ['/wp-admin', '/wp-includes', '/wp-content', '/wp-login.php', '/xmlrpc.php']
        found = []
        
        for path in paths:
            try:
                r = self.session.get(self.target_url + path, timeout=10)
                if r.status_code == 200:
                    found.append(path)
            except:
                pass
        
        if len(found) >= 2:
            self.results['is_wordpress'] = True
            self.results['findings'].append({
                'severity': 'info',
                'title': 'WordPress Detected',
                'description': f'WordPress paths found: {", ".join(found)}'
            })
            return True
        
        self.results['findings'].append({
            'severity': 'error',
            'title': 'WordPress Not Detected',
            'description': 'Could not confirm this site runs WordPress'
        })
        return False
    
    def check_xmlrpc(self):
        """Check XML-RPC"""
        if not self.results['is_wordpress']:
            return
        
        try:
            r = self.session.get(self.target_url + '/xmlrpc.php', timeout=10)
            if r.status_code == 200 and 'XML-RPC' in r.text:
                self.results['findings'].append({
                    'severity': 'warning',
                    'title': 'XML-RPC Enabled',
                    'description': 'XML-RPC is accessible. Can be used for brute force attacks.',
                    'recommendation': 'Disable XML-RPC via plugin or .htaccess'
                })
                self.results['security_score'] -= 15
        except:
            pass
    
    def check_security_headers(self):
        """Check security headers"""
        try:
            r = self.session.get(self.target_url, timeout=10)
            headers = r.headers
            
            checks = {
                'X-Frame-Options': 'Missing. Site vulnerable to clickjacking.',
                'X-XSS-Protection': 'Missing. XSS filter not enforced.',
                'X-Content-Type-Options': 'Missing. MIME sniffing possible.'
            }
            
            for header, message in checks.items():
                if header not in headers:
                    self.results['findings'].append({
                        'severity': 'low',
                        'title': f'Missing Security Header: {header}',
                        'description': message,
                        'recommendation': f'Add {header} header to server config'
                    })
                    self.results['security_score'] -= 5
        except:
            pass
    
    def check_exposed_files(self):
        """Check for exposed sensitive files"""
        files = [
            '/wp-config.php.bak',
            '/wp-config.php.old',
            '/.git/HEAD',
            '/readme.html',
            '/license.txt',
            '/wp-content/debug.log'
        ]
        
        for file in files:
            try:
                r = self.session.get(self.target_url + file, timeout=10)
                if r.status_code == 200:
                    self.results['findings'].append({
                        'severity': 'high',
                        'title': f'Exposed File: {file}',
                        'description': f'Sensitive file accessible',
                        'recommendation': 'Remove or restrict access'
                    })
                    self.results['security_score'] -= 20
            except:
                pass
    
    def run_scan(self):
        """Run all checks"""
        print(f"\n{'='*50}")
        print(f"Scanning: {self.target_url}")
        print(f"{'='*50}\n")
        
        self.check_wordpress()
        self.check_xmlrpc()
        self.check_security_headers()
        self.check_exposed_files()
        
        self.results['security_score'] = max(0, self.results['security_score'])
        
        print(f"\n{'='*50}")
        print(f"SCAN COMPLETE")
        print(f"WordPress: {self.results['is_wordpress']}")
        print(f"Score: {self.results['security_score']}/100")
        print(f"{'='*50}\n")
        
        return self.results

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', required=True, help='Website URL')
    parser.add_argument('--output', default='scan_result.json', help='Output file')
    
    args = parser.parse_args()
    
    if not args.url.startswith(('http://', 'https://')):
        print("Error: URL must start with http:// or https://")
        sys.exit(1)
    
    scanner = WordPressScanner(args.url)
    results = scanner.run_scan()
    
    with open(args.output, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n[*] Results saved to {args.output}")

if __name__ == '__main__':
    main()
