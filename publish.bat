@echo off
echo NPM PUBLISH
echo Before continuing, ensure that:
echo - you are logged in (npm whoami)
echo - you have successfully rebuilt all the libraries (npm run...)
pause

cd .\dist\myrmidon\cadmus-part-lexicography-lemma
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-part-lexicography-word-collocations
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-part-lexicography-word-forms
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-part-lexicography-word-senses
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-part-lexicography-pg
call npm publish --access=public
cd ..\..\..
pause

echo ALL DONE
