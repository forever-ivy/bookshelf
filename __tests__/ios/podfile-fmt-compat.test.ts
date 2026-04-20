import fs from 'node:fs';
import path from 'node:path';

describe('ios Podfile fmt compatibility patch', () => {
  it('forces fmt to build with c++17 in post_install', () => {
    const podfilePath = path.join(process.cwd(), 'ios', 'Podfile');
    const podfile = fs.readFileSync(podfilePath, 'utf8');

    expect(podfile).toMatch(/target\.name == 'fmt'/);
    expect(podfile).toMatch(
      /CLANG_CXX_LANGUAGE_STANDARD'\]\s*=\s*'c\+\+17'/,
    );
  });
});
