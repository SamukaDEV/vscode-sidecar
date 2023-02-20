# Sidecar Extension

Simply hit CTRL + ALT + H to see the magic happen!

# Local package extension:

Install vsce(Visual Studio Code Extensions)

```bash
npm install -g @vscode/vsce
```

Package with

```bash
$ cd myExtension
$ vsce package
# myExtension.vsix generated
$ vsce publish
# <publisherID>.myExtension published to VS Code Marketplace
```
