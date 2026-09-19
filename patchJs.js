const fs = require('fs');

// EDIT PROFILE
let file = 'frontend/src/screens/Profile/EditProfile.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /<Text style=\{styles\.headerTitle\}>Edit Profile<\/Text>/g,
  '<Text style={styles.headerTitle}>Edit<Text style={{ color: \'#007185\' }}>Profile</Text></Text>'
);
content = content.replace(
  /color="#1A1F36"/g,
  'color="#0F1111"'
);
content = content.replace(
  /color="#0052CC"/g,
  'color="#007185"'
);

fs.writeFileSync(file, content);

// CHANGE PASSWORD
file = 'frontend/src/screens/Profile/ChangePassword.js';
content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /<Text style=\{styles\.headerTitle\}>Security<\/Text>/g,
  '<Text style={styles.headerTitle}>Change<Text style={{ color: \'#007185\' }}>Password</Text></Text>'
);
content = content.replace(
  /color="#1A1F36"/g,
  'color="#0F1111"'
);
content = content.replace(
  /color="#7C3AED"/g,
  'color="#007185"'
);

fs.writeFileSync(file, content);

console.log('JS files patched!');

