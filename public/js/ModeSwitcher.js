class ModeSwitcher extends Emitter {
  switchMode(event) {
    if (event.target.nodeName.toLowerCase() !== 'a') {
      return false;
    }
    
    switch (Settings.get('mode')) {
      case 'owned':
        Settings.set('mode', 'public');
        return;
      case 'public':
        Settings.set('mode', 'owned');
        return;
    }
  }
}